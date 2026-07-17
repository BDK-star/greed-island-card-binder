from pathlib import Path
from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
WORKSPACE = PROJECT.parent
COLLECTION = WORKSPACE / "Greed_Island_Cards"
PUBLIC = PROJECT / "public"
SOURCE_OVERRIDES = {
    ("zh", "022"): PROJECT / "assets" / "source-overrides" / "zh" / "022.png",
}

SOURCES = {
    "zh": COLLECTION / "02_Chinese",
    "ja": COLLECTION / "01_Japanese_Original",
    "en": COLLECTION / "03_English",
}


def save_webp(source: Path, target: Path, max_width: int, quality: int) -> None:
    with Image.open(source) as image:
        image = image.convert("RGB")
        if image.width > max_width:
            height = round(image.height * max_width / image.width)
            image = image.resize((max_width, height), Image.Resampling.LANCZOS)
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, "WEBP", quality=quality, method=6)


for language, source_dir in SOURCES.items():
    source_files = sorted(path for path in source_dir.iterdir() if path.is_file())
    if len(source_files) != 100:
        raise RuntimeError(f"Expected 100 source images for {language}, found {len(source_files)}")

    for index, source in enumerate(source_files):
        number = f"{index:03d}"
        if source.stem != number:
            raise RuntimeError(f"Unexpected card sequence for {language}: {source.name}")
        source = SOURCE_OVERRIDES.get((language, number), source)
        save_webp(source, PUBLIC / "cards" / language / f"{number}.webp", 900, 88)
        save_webp(source, PUBLIC / "thumbs" / language / f"{number}.webp", 260, 72)

print("Prepared 300 mobile card images and 300 thumbnails")
