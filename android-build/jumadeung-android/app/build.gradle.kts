plugins {
    id("com.android.application")
}

android {
    namespace = "com.jumadeung.familymemory"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.jumadeung.familymemory"
        minSdk = 26
        targetSdk = 35
        versionCode = 10001
        versionName = "1.0.0-rc1"
        buildConfigField("String", "WEB_APP_URL", "\"https://gogog01-29-2021.github.io/mitx-8s50.github.io/jumadeung-native-ui/\"")
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity:1.10.1")
    implementation("androidx.core:core:1.15.0")
    implementation("androidx.webkit:webkit:1.12.1")
}
