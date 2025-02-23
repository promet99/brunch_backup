# Brunch Backup 브런치 백업저장기
- Backup Brunch articles to Markdown files.
- 브런치 글과 이미지를 마크다운 파일로 저장합니다.

## Usage
1. Install Deno
2. Update backupArticles.ts (BASE_URL and number of pages to backup)
3. Run the script

```bash
deno run backupArticles.ts
```

## Notes
- 크롤링, 오남용 및 저작권 위반 등으로 인한 책임은 사용자에게 있습니다.
- Only for personal use, use AYOR, only backup if you own the rights to the content
- Also downloads json from attr `data-app` (unused)
- Unsupported: Bullet points, Variations of Quotes, Alignments, Image size, etc.