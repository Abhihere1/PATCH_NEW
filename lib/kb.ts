import fs from "fs";
import path from "path";

const KB_WORKFLOWS_DIR = path.join(process.cwd(), "knowledge_base", "workflows");
const KB_IMAGES_DIR = path.join(process.cwd(), "knowledge_base", "images");

export function kbFileExists(category: string): boolean {
  try {
    const filePath = path.join(KB_WORKFLOWS_DIR, `${category.toLowerCase()}.md`);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function loadKBForCategory(category: string): string {
  try {
    const filePath = path.join(KB_WORKFLOWS_DIR, `${category.toLowerCase()}.md`);
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export function loadAllKB(): string {
  try {
    if (!fs.existsSync(KB_WORKFLOWS_DIR)) return "";
    const files = fs.readdirSync(KB_WORKFLOWS_DIR).filter((f) => f.endsWith(".md"));
    if (files.length === 0) return "";

    return files
      .map((filename) => {
        const category = filename.replace(".md", "").toUpperCase();
        const content = fs.readFileSync(path.join(KB_WORKFLOWS_DIR, filename), "utf-8");
        return `[CATEGORY: ${category} | FILE: ${filename}]\n${content}`;
      })
      .join("\n\n");
  } catch {
    return "";
  }
}

export function imageExists(filename: string): boolean {
  try {
    const filePath = path.join(KB_IMAGES_DIR, filename);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function getImagePath(filename: string): string {
  return path.join(KB_IMAGES_DIR, filename);
}
