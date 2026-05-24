const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'models', 'models.py');

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. ORMモデル定義の ` = Column(` を ` = mapped_column(` に置換
    content = content.replace(/ = Column\(/g, " = mapped_column(");

    // 2. インポート文の修正
    content = content.replace(
        "from sqlalchemy.orm import relationship, Mapped",
        "from sqlalchemy.orm import relationship, Mapped, mapped_column"
    )

    // 3. 先頭の `# pyright: reportAssignmentType=false` を削除（もはや不要なため）
    content = content.replace("# pyright: reportAssignmentType=false\n", "");

    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Conversion successfully completed by Node.js!");
} catch (err) {
    console.error("Error during conversion:", err);
    process.exit(1);
}
