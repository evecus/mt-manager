use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: u64,
    pub extension: String,
    pub is_hidden: bool,
    pub is_symlink: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirResult {
    pub entries: Vec<FileEntry>,
    pub path: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub entries: Vec<FileEntry>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ArchiveEntry {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub compressed_size: u64,
    pub is_dir: bool,
    pub modified: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: u64,
    pub created: u64,
    pub is_dir: bool,
    pub extension: String,
    pub mime_type: String,
    pub md5: String,
    pub sha256: String,
    pub permissions: String,
}

fn get_file_entry(path: &Path) -> Option<FileEntry> {
    let metadata = fs::symlink_metadata(path).ok()?;
    let name = path.file_name()?.to_string_lossy().to_string();
    let is_symlink = metadata.file_type().is_symlink();
    let real_metadata = if is_symlink {
        fs::metadata(path).unwrap_or(metadata.clone())
    } else {
        metadata.clone()
    };
    
    let modified = real_metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let extension = if real_metadata.is_dir() {
        String::new()
    } else {
        path.extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default()
    };

    let is_hidden = name.starts_with('.');
    
    #[cfg(windows)]
    let is_hidden = {
        use std::os::windows::fs::MetadataExt;
        (metadata.file_attributes() & 0x2) != 0
    };

    Some(FileEntry {
        name,
        path: path.to_string_lossy().to_string(),
        is_dir: real_metadata.is_dir(),
        size: if real_metadata.is_dir() { 0 } else { real_metadata.len() },
        modified,
        extension,
        is_hidden,
        is_symlink,
    })
}

#[tauri::command]
pub fn list_directory(path: String, show_hidden: bool) -> DirResult {
    let dir_path = Path::new(&path);
    
    if !dir_path.exists() {
        return DirResult {
            entries: vec![],
            path,
            error: Some("目录不存在".to_string()),
        };
    }

    match fs::read_dir(dir_path) {
        Ok(entries) => {
            let mut files: Vec<FileEntry> = entries
                .filter_map(|e| e.ok())
                .filter_map(|e| get_file_entry(&e.path()))
                .filter(|e| show_hidden || !e.is_hidden)
                .collect();

            files.sort_by(|a, b| {
                if a.is_dir != b.is_dir {
                    b.is_dir.cmp(&a.is_dir)
                } else {
                    a.name.to_lowercase().cmp(&b.name.to_lowercase())
                }
            });

            DirResult {
                entries: files,
                path,
                error: None,
            }
        }
        Err(e) => DirResult {
            entries: vec![],
            path,
            error: Some(e.to_string()),
        },
    }
}

#[tauri::command]
pub fn get_drives() -> Vec<serde_json::Value> {
    let mut drives = vec![];

    #[cfg(windows)]
    {
        for letter in 'A'..='Z' {
            let path = format!("{}:\\", letter);
            if Path::new(&path).exists() {
                drives.push(serde_json::json!({
                    "name": format!("{}盘 ({}:)", letter, letter),
                    "path": path,
                    "letter": letter.to_string(),
                }));
            }
        }
    }

    #[cfg(not(windows))]
    {
        drives.push(serde_json::json!({
            "name": "根目录",
            "path": "/",
            "letter": "/",
        }));
        
        if let Ok(entries) = fs::read_dir("/media") {
            for e in entries.flatten() {
                drives.push(serde_json::json!({
                    "name": e.file_name().to_string_lossy().to_string(),
                    "path": e.path().to_string_lossy().to_string(),
                    "letter": "D",
                }));
            }
        }
    }

    drives
}

#[tauri::command]
pub fn read_file_text(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file_text(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_bytes(path: String, offset: u64, length: usize) -> Result<Vec<u8>, String> {
    use std::io::{Read, Seek, SeekFrom};
    let mut file = fs::File::open(&path).map_err(|e| e.to_string())?;
    file.seek(SeekFrom::Start(offset)).map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; length];
    let n = file.read(&mut buf).map_err(|e| e.to_string())?;
    buf.truncate(n);
    Ok(buf)
}

#[tauri::command]
pub fn copy_file(src: String, dst: String) -> Result<(), String> {
    let dst_path = Path::new(&dst);
    if let Some(parent) = dst_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(&src, &dst).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn move_file(src: String, dst: String) -> Result<(), String> {
    let dst_path = Path::new(&dst);
    if let Some(parent) = dst_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dst).or_else(|_| {
        fs::copy(&src, &dst).map(|_| ())?;
        fs::remove_file(&src)
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p)
    } else {
        fs::remove_file(p)
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::File::create(&path).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_file(src: String, new_name: String) -> Result<String, String> {
    let src_path = Path::new(&src);
    let parent = src_path.parent().ok_or("无法获取父目录")?;
    let new_path = parent.join(&new_name);
    fs::rename(&src_path, &new_path).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn search_files(
    root: String,
    pattern: String,
    search_content: bool,
    content_pattern: String,
    max_results: usize,
) -> SearchResult {
    use walkdir::WalkDir;
    use regex::Regex;

    let name_regex = Regex::new(&format!("(?i){}", regex::escape(&pattern))).ok();
    let content_regex = if search_content && !content_pattern.is_empty() {
        Regex::new(&content_pattern).ok()
    } else {
        None
    };

    let mut entries = vec![];
    let walker = WalkDir::new(&root).max_depth(10).into_iter();

    for entry in walker.filter_map(|e| e.ok()) {
        if entries.len() >= max_results {
            break;
        }
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        let name_match = if pattern.is_empty() {
            true
        } else if let Some(ref re) = name_regex {
            re.is_match(&name)
        } else {
            name.to_lowercase().contains(&pattern.to_lowercase())
        };

        if !name_match {
            continue;
        }

        if let Some(ref content_re) = content_regex {
            if path.is_file() {
                if let Ok(text) = fs::read_to_string(path) {
                    if !content_re.is_match(&text) {
                        continue;
                    }
                } else {
                    continue;
                }
            }
        }

        if let Some(fe) = get_file_entry(path) {
            entries.push(fe);
        }
    }

    let total = entries.len();
    SearchResult { entries, total }
}

#[tauri::command]
pub fn batch_rename(
    paths: Vec<String>,
    pattern: String,
    replacement: String,
    use_regex: bool,
    add_prefix: String,
    add_suffix: String,
    start_number: i64,
    number_padding: usize,
) -> Result<Vec<String>, String> {
    use regex::Regex;
    let mut results = vec![];

    for (i, path) in paths.iter().enumerate() {
        let p = Path::new(path);
        let parent = p.parent().ok_or("无法获取父目录")?;
        let stem = p.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let ext = p.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();

        let mut new_stem = stem.clone();

        if !pattern.is_empty() {
            new_stem = if use_regex {
                let re = Regex::new(&pattern).map_err(|e| e.to_string())?;
                re.replace_all(&new_stem, replacement.as_str()).to_string()
            } else {
                new_stem.replace(&pattern, &replacement)
            };
        }

        if start_number >= 0 {
            let num = start_number + i as i64;
            new_stem = format!("{:0>width$}{}", num, new_stem, width = number_padding);
        }

        let new_name = format!("{}{}{}{}", add_prefix, new_stem, add_suffix, ext);
        let new_path = parent.join(&new_name);
        fs::rename(p, &new_path).map_err(|e| e.to_string())?;
        results.push(new_path.to_string_lossy().to_string());
    }

    Ok(results)
}

#[tauri::command]
pub fn list_archive(path: String) -> Result<Vec<ArchiveEntry>, String> {
    use std::io::Read;
    let ext = Path::new(&path)
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "zip" => {
            let file = fs::File::open(&path).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
            let mut entries = vec![];
            for i in 0..archive.len() {
                let entry = archive.by_index(i).map_err(|e| e.to_string())?;
                let modified = entry.last_modified()
                    .map(|dt| {
                        // Convert zip datetime to unix timestamp approximately
                        let year = dt.year() as u64;
                        let days = (year - 1970) * 365 * 24 * 3600;
                        days
                    })
                    .unwrap_or(0);
                entries.push(ArchiveEntry {
                    name: entry.name().to_string(),
                    path: entry.name().to_string(),
                    size: entry.size(),
                    compressed_size: entry.compressed_size(),
                    is_dir: entry.is_dir(),
                    modified,
                });
            }
            Ok(entries)
        }
        "tar" | "tgz" | "gz" | "bz2" | "xz" | "tbz2" => {
            let file = fs::File::open(&path).map_err(|e| e.to_string())?;
            let mut entries = vec![];
            
            let tar_result: Result<(), String> = (|| {
                if ext == "tgz" || (ext == "gz" && path.ends_with(".tar.gz")) {
                    let gz = flate2::read::GzDecoder::new(file);
                    let mut archive = tar::Archive::new(gz);
                    for entry in archive.entries().map_err(|e| e.to_string())? {
                        let entry = entry.map_err(|e| e.to_string())?;
                        let header = entry.header();
                        entries.push(ArchiveEntry {
                            name: entry.path().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
                            path: entry.path().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
                            size: header.size().unwrap_or(0),
                            compressed_size: 0,
                            is_dir: header.entry_type().is_dir(),
                            modified: header.mtime().unwrap_or(0),
                        });
                    }
                } else if ext == "gz" {
                    entries.push(ArchiveEntry {
                        name: path.trim_end_matches(".gz").to_string(),
                        path: path.trim_end_matches(".gz").to_string(),
                        size: 0,
                        compressed_size: 0,
                        is_dir: false,
                        modified: 0,
                    });
                } else if ext == "tar" {
                    let mut archive = tar::Archive::new(file);
                    for entry in archive.entries().map_err(|e| e.to_string())? {
                        let entry = entry.map_err(|e| e.to_string())?;
                        let header = entry.header();
                        entries.push(ArchiveEntry {
                            name: entry.path().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
                            path: entry.path().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
                            size: header.size().unwrap_or(0),
                            compressed_size: 0,
                            is_dir: header.entry_type().is_dir(),
                            modified: header.mtime().unwrap_or(0),
                        });
                    }
                }
                Ok(())
            })();
            
            if let Err(e) = tar_result {
                return Err(e);
            }
            
            Ok(entries)
        }
        _ => Err(format!("不支持的压缩格式: {}", ext)),
    }
}

#[tauri::command]
pub fn extract_archive(archive_path: String, dest_dir: String) -> Result<(), String> {
    use std::io::Read;
    let ext = Path::new(&archive_path)
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    match ext.as_str() {
        "zip" => {
            let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
            let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
            archive.extract(&dest_dir).map_err(|e| e.to_string())?;
        }
        "gz" | "tgz" => {
            let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
            let gz = flate2::read::GzDecoder::new(file);
            let mut archive = tar::Archive::new(gz);
            archive.unpack(&dest_dir).map_err(|e| e.to_string())?;
        }
        "tar" => {
            let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
            let mut archive = tar::Archive::new(file);
            archive.unpack(&dest_dir).map_err(|e| e.to_string())?;
        }
        "bz2" | "tbz2" => {
            let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
            let bz = bzip2::read::BzDecoder::new(file);
            let mut archive = tar::Archive::new(bz);
            archive.unpack(&dest_dir).map_err(|e| e.to_string())?;
        }
        "xz" => {
            let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
            let xz = xz2::read::XzDecoder::new(file);
            let mut archive = tar::Archive::new(xz);
            archive.unpack(&dest_dir).map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("不支持的格式: {}", ext)),
    }
    Ok(())
}

#[tauri::command]
pub fn compress_to_zip(files: Vec<String>, dest: String) -> Result<(), String> {
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    
    let file = fs::File::create(&dest).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for path_str in &files {
        let path = Path::new(path_str);
        if path.is_file() {
            let name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
            zip.start_file(&name, options).map_err(|e| e.to_string())?;
            let data = fs::read(path).map_err(|e| e.to_string())?;
            zip.write_all(&data).map_err(|e| e.to_string())?;
        } else if path.is_dir() {
            add_dir_to_zip(&mut zip, path, path, options).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn add_dir_to_zip(
    zip: &mut zip::ZipWriter<fs::File>,
    base: &Path,
    dir: &Path,
    options: zip::write::SimpleFileOptions,
) -> Result<(), Box<dyn std::error::Error>> {
    use std::io::Write;
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let rel = path.strip_prefix(base.parent().unwrap_or(base))?;
        if path.is_dir() {
            zip.add_directory(rel.to_string_lossy().to_string(), options)?;
            add_dir_to_zip(zip, base, &path, options)?;
        } else {
            zip.start_file(rel.to_string_lossy().to_string(), options)?;
            let data = fs::read(&path)?;
            zip.write_all(&data)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_file_info(path: String) -> Result<FileInfo, String> {
    use sha2::{Sha256, Digest};
    
    let p = Path::new(&path);
    let metadata = fs::metadata(p).map_err(|e| e.to_string())?;
    
    let modified = metadata.modified().ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs()).unwrap_or(0);
    let created = metadata.created().ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs()).unwrap_or(0);

    let extension = p.extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let mime_type = mime_guess::from_path(p).first_or_octet_stream().to_string();

    let (md5_hash, sha256_hash) = if metadata.is_file() && metadata.len() < 100 * 1024 * 1024 {
        let data = fs::read(p).unwrap_or_default();
        let md5 = format!("{:x}", md5::compute(&data));
        let mut hasher = Sha256::new();
        hasher.update(&data);
        let sha256 = hex::encode(hasher.finalize());
        (md5, sha256)
    } else {
        ("(文件过大)".to_string(), "(文件过大)".to_string())
    };

    #[cfg(unix)]
    let permissions = {
        use std::os::unix::fs::PermissionsExt;
        format!("{:o}", metadata.permissions().mode())
    };
    #[cfg(not(unix))]
    let permissions = if metadata.permissions().readonly() {
        "只读".to_string()
    } else {
        "读写".to_string()
    };

    Ok(FileInfo {
        name: p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(),
        path,
        size: metadata.len(),
        modified,
        created,
        is_dir: metadata.is_dir(),
        extension,
        mime_type,
        md5: md5_hash,
        sha256: sha256_hash,
        permissions,
    })
}

#[tauri::command]
pub fn get_home_dir() -> String {
    dirs_next::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| {
            #[cfg(windows)] { "C:\\Users".to_string() }
            #[cfg(not(windows))] { "/home".to_string() }
        })
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn get_parent_path(path: String) -> Option<String> {
    Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            list_directory,
            get_drives,
            read_file_text,
            write_file_text,
            read_file_bytes,
            copy_file,
            move_file,
            delete_file,
            create_dir,
            create_file,
            rename_file,
            search_files,
            batch_rename,
            list_archive,
            extract_archive,
            compress_to_zip,
            get_file_info,
            get_home_dir,
            path_exists,
            get_parent_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
