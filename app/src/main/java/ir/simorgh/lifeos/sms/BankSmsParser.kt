package ir.simorgh.lifeos.sms

import org.json.JSONObject
import java.security.MessageDigest
import kotlin.math.roundToLong

/**
 * موتور هوشمند تحلیل پیامک‌های تراکنش بانکی — شرکت سیمرغ (سید هادی موسوی)
 * حریم خصوصی مطلق: فقط و فقط پیامک‌های واریز/برداشت بانکی پردازش می‌شوند.
 * تمام پیامک‌های شخصی، تبلیغاتی و رمزهای پویا (OTP) فوراً نادیده گرفته می‌شوند.
 */
object BankSmsParser {

    data class ParsedBankTx(
        val idHash: String,
        val kind: String, // "expense" | "income"
        val amountToman: Long,
        val balanceToman: Long?,
        val bankName: String,
        val accountMask: String,
        val category: String,
        val title: String,
        val timestampMs: Long
    ) {
        fun toJson(): JSONObject = JSONObject().apply {
            put("id_hash", idHash)
            put("kind", kind)
            put("amount", amountToman)
            if (balanceToman != null) put("balance_after", balanceToman)
            put("bank_name", bankName)
            put("account_mask", accountMask)
            put("category", category)
            put("title", title)
            put("timestamp_ms", timestampMs)
        }
    }

    private val OTP_BLOCK_REGEX = Regex(
        "(رمز\\s*پویا|رمز\\s*دوم|کد\\s*تایید|کد\\s*تأیید|کد\\s*ورود|کد\\s*فعال|محرمانه|otp|verification\\s*code|security\\s*code|passcode)",
        RegexOption.IGNORE_CASE
    )

    private val BANK_MAP = listOf(
        "ملت" to "بانک ملت", "mellat" to "بانک ملت",
        "بلوبانک" to "بلوبانک", "دیجیتال خاورمیانه" to "بلوبانک", "blubank" to "بلوبانک", "blu" to "بلوبانک",
        "ملی" to "بانک ملی", "melli" to "بانک ملی", "bmi" to "بانک ملی",
        "سامان" to "بانک سامان", "saman" to "بانک سامان",
        "پاسارگاد" to "بانک پاسارگاد", "pasargad" to "بانک پاسارگاد",
        "تجارت" to "بانک تجارت", "tejarat" to "بانک تجارت",
        "صادرات" to "بانک صادرات", "saderat" to "بانک صادرات", "bsi" to "بانک صادرات",
        "سپه" to "بانک سپه", "sepah" to "بانک سپه",
        "کشاورزی" to "بانک کشاورزی", "keshavarzi" to "بانک کشاورزی",
        "رفاه" to "بانک رفاه", "refah" to "بانک رفاه",
        "پارسیان" to "بانک پارسیان", "parsian" to "بانک پارسیان",
        "آینده" to "بانک آینده", "ayandeh" to "بانک آینده",
        "رسالت" to "بانک رسالت", "resalat" to "بانک رسالت",
        "مسکن" to "بانک مسکن", "maskan" to "بانک مسکن",
        "سینا" to "بانک سینا", "sina" to "بانک سینا",
        "شهر" to "بانک شهر", "shahr" to "بانک شهر",
        "گردشگری" to "بانک گردشگری", "gardeshgari" to "بانک گردشگری",
        "اقتصاد" to "اقتصاد نوین", "enbank" to "اقتصاد نوین",
        "کارآفرین" to "بانک کارآفرین",
        "مهر ایران" to "قرض‌الحسنه مهر ایران",
        "پست بانک" to "پست بانک"
    )

    private val EXPENSE_REGEX = Regex(
        "(برداشت|خرید|کسر|انتقال\\s*از|پرداخت|حواله\\s*صادره|کارمزد|کاهش\\s*موجودی|debit|withdraw|purchase|spent|payment)",
        RegexOption.IGNORE_CASE
    )
    private val INCOME_REGEX = Regex(
        "(واریز|افزایش\\s*موجودی|انتقال\\s*به|سود|حقوق|پایا\\s*واریز|ساتنا\\s*واریز|برگشت\\s*وجه|credit|deposit|received)",
        RegexOption.IGNORE_CASE
    )
    private val CURRENCY_OR_BALANCE_REGEX = Regex(
        "(مانده|موجودی|موجودي|ریال|ريال|تومان|مبلغ|balance|avail|irr|usd)",
        RegexOption.IGNORE_CASE
    )

    fun normalizeDigits(input: String): String {
        val sb = StringBuilder(input.length)
        for (ch in input) {
            when (ch) {
                in '۰'..'۹' -> sb.append(('0'.code + (ch.code - '۰'.code)).toChar())
                in '٠'..'٩' -> sb.append(('0'.code + (ch.code - '٠'.code)).toChar())
                'ي' -> sb.append('ی')
                'ك' -> sb.append('ک')
                else -> sb.append(ch)
            }
        }
        return sb.toString()
    }

    fun parse(sender: String, rawBody: String, timestampMs: Long = System.currentTimeMillis()): ParsedBankTx? {
        val clean = normalizeDigits(rawBody).trim()
        if (clean.length < 16) return null

        // ۱. مسدودسازی مطلق پیامک‌های رمز پویا و کدهای امنیتی
        if (OTP_BLOCK_REGEX.containsMatchIn(clean)) return null

        // ۲. بررسی ساختار پیامک بانکی (باید هم کلیدواژه مالی/مانده داشته باشد و هم مبلغ عددی)
        if (!CURRENCY_OR_BALANCE_REGEX.containsMatchIn(clean)) return null

        val hasExpenseWord = EXPENSE_REGEX.containsMatchIn(clean)
        val hasIncomeWord = INCOME_REGEX.containsMatchIn(clean)
        val signedMinus = Regex("(?m)^\\s*-\\s*[0-9,]{4,}").containsMatchIn(clean) || clean.contains("مبلغ-") || clean.contains("برداشت:")
        val signedPlus = Regex("(?m)^\\s*\\+\\s*[0-9,]{4,}").containsMatchIn(clean) || clean.contains("مبلغ+") || clean.contains("واریز:")

        if (!hasExpenseWord && !hasIncomeWord && !signedMinus && !signedPlus) return null

        val kind = when {
            hasIncomeWord && !hasExpenseWord -> "income"
            signedPlus && !signedMinus -> "income"
            else -> "expense"
        }

        // تشخیص واحد پول پیامک (بیش از ۹۸٪ بانک‌های ایران به ریال ارسال می‌کنند مگر صراحتاً «تومان» ذکر شود)
        val isExplicitToman = clean.contains("تومان") && !clean.contains("ریال")

        // ۳. استخراج مانده حساب (Balance)
        val balanceMatch = Regex("(?:مانده|موجودی|balance|bal)\\s*[:：=-]?\\s*([0-9][0-9,]{3,})", RegexOption.IGNORE_CASE).find(clean)
        val rawBalance = balanceMatch?.groupValues?.get(1)?.replace(",", "")?.toLongOrNull()
        val balanceToman = rawBalance?.let { if (isExplicitToman) it else (it / 10.0).roundToLong() }

        // ۴. استخراج مبلغ تراکنش (Amount)
        var rawAmount: Long? = null
        val labeledAmt = Regex("(?:مبلغ|برداشت|واریز|خرید|کسر|افزایش|کاهش|amount|debit|credit)\\s*[:：+-]?\\s*([0-9][0-9,]{3,})", RegexOption.IGNORE_CASE).find(clean)
        if (labeledAmt != null) {
            rawAmount = labeledAmt.groupValues[1].replace(",", "").toLongOrNull()
        }
        if (rawAmount == null) {
            val signedAmt = Regex("[+-]\\s*([0-9][0-9,]{3,})").find(clean)
            if (signedAmt != null) rawAmount = signedAmt.groupValues[1].replace(",", "").toLongOrNull()
        }
        if (rawAmount == null) {
            // انتخاب اولین عدد بزرگ که با شماره حساب یا مانده یکی نباشد
            val allNums = Regex("([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{5,12})").findAll(clean)
                .mapNotNull { it.value.replace(",", "").toLongOrNull() }
                .filter { it != rawBalance && it in 10_000L..500_000_000_000L }
                .toList()
            rawAmount = allNums.firstOrNull()
        }

        if (rawAmount == null || rawAmount <= 0L) return null
        val amountToman = if (isExplicitToman) rawAmount else (rawAmount / 10.0).roundToLong()
        if (amountToman < 500L) return null

        // ۵. تشخیص نام بانک و ۴ رقم آخر حساب/کارت
        val combinedMeta = "${normalizeDigits(sender).lowercase()} ${clean.lowercase()}"
        val bankName = BANK_MAP.firstOrNull { combinedMeta.contains(it.first) }?.second ?: "حساب بانکی"

        val accMatch = Regex("(?:حساب|کارت|سپرده|card|acc)[^0-9]*([0-9.*-]{4,})").find(clean)
        val digitsOnly = accMatch?.groupValues?.get(1)?.replace(Regex("[^0-9]"), "") ?: ""
        val accountMask = if (digitsOnly.length >= 4) digitsOnly.takeLast(4) else ""

        // ۶. دسته‌بندی هوشمند خودکار تراکنش
        val category = autoCategorize(clean, kind)
        val actionLabel = if (kind == "income") "واریز به" else "برداشت از"
        val maskSuffix = if (accountMask.isNotEmpty()) " ($accountMask)" else ""
        val title = "$actionLabel $bankName$maskSuffix"

        val minuteBucket = timestampMs / 60_000L
        val hashSrc = "$sender|$kind|$amountToman|${balanceToman ?: 0L}|$minuteBucket"
        val idHash = sha256Short(hashSrc)

        return ParsedBankTx(
            idHash = idHash,
            kind = kind,
            amountToman = amountToman,
            balanceToman = balanceToman,
            bankName = bankName,
            accountMask = accountMask,
            category = category,
            title = title,
            timestampMs = timestampMs
        )
    }

    private fun autoCategorize(text: String, kind: String): String {
        if (kind == "income") return "حقوق و درآمد"
        return when {
            Regex("(اسنپ|تپسی|بنزین|جایگاه|مترو|تاکسی|بلیت|snapp|tapsi)", RegexOption.IGNORE_CASE).containsMatchIn(text) -> "رفت‌وآمد"
            Regex("(رستوران|کافه|فست|پیتزا|غذا|اسنپ\\s*فود|نانوایی|شیرینی)", RegexOption.IGNORE_CASE).containsMatchIn(text) -> "خوراک و کافه"
            Regex("(کوروش|رفاه|جانبو|هایپر|سوپرمارکت|دیجی\\s*کالا|میوه|پروتئین)", RegexOption.IGNORE_CASE).containsMatchIn(text) -> "خرید روزمره"
            Regex("(قبض|برق|گاز|آب|اجاره|همراه\\s*اول|ایرانسل|رایتل|اینترنت|شارژ)", RegexOption.IGNORE_CASE).containsMatchIn(text) -> "قبض و مسکن"
            Regex("(داروخانه|بیمارستان|کلینیک|پزشک|آزمایشگاه|باشگاه)", RegexOption.IGNORE_CASE).containsMatchIn(text) -> "سلامت و ورزش"
            Regex("(دانشگاه|کتاب|شهریه|آموزش)", RegexOption.IGNORE_CASE).containsMatchIn(text) -> "دانشگاه و آموزش"
            else -> "سایر"
        }
    }

    private fun sha256Short(s: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(s.toByteArray())
        return bytes.take(8).joinToString("") { "%02x".format(it) }
    }
}
