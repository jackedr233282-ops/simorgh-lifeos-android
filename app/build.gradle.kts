plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ir.simorgh.lifeos"
    compileSdk = 35

    defaultConfig {
        applicationId = "ir.simorgh.lifeos"
        minSdk = 26
        targetSdk = 35
        versionCode = 21
        versionName = "2.1.0-Simorgh-Pure"

        resValue("string", "creator_name_fa", "سید هادی موسوی")
        resValue("string", "creator_name_en", "Syed Hadi Mosavi")
        resValue("string", "company_name_fa", "شرکت سیمرغ")
        resValue("string", "company_name_en", "Simorgh Co.")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("com.google.android.material:material:1.12.0")
}
