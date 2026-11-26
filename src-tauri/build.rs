fn main() {
    // Google OAuth client credentials are compiled in (`option_env!` in google.rs).
    // CI passes them as environment variables; locally they can live in src-tauri/.env
    // or the project root .env (the first one found wins).
    for path in [".env", "../.env"] {
        println!("cargo:rerun-if-changed={path}");
    }
    for key in ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] {
        println!("cargo:rerun-if-env-changed={key}");
    }
    let env_file = [".env", "../.env"].iter().find_map(|p| std::fs::read_to_string(p).ok());
    if let Some(contents) = env_file {
        for line in contents.lines() {
            let Some((k, v)) = line.split_once('=') else { continue };
            let k = k.trim();
            if (k == "GOOGLE_CLIENT_ID" || k == "GOOGLE_CLIENT_SECRET") && std::env::var(k).is_err() {
                println!("cargo:rustc-env={k}={}", v.trim().trim_matches('"'));
            }
        }
    }
    tauri_build::build()
}
