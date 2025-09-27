import iconv from "iconv-lite";


// 1. 转成 GBK Buffer
const gbkBuf = iconv.encode('中文测试', "gbk");
// atc_content=%D6%D0%CE%C4%B2%E2%CA%D4
console.log(gbkBuf); // <Buffer d6 d0 ce c4 b2 e2 ca d4>

const text = Array.from(gbkBuf, b => '%' + b.toString(16).toUpperCase().padStart(2, '0')).join('');
console.log(text); // %D6%D0%CE%C4%B2%E2%CA%D4

