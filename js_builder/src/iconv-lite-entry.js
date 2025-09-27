import iconv from "iconv-lite";
import { Buffer } from 'buffer';

export function utf8ToGBKBuffer(string) {
    return iconv.encode(string, "gbk");
}