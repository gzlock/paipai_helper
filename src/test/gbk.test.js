import { utf8ToGBKPercent } from "../linkedom-build/src/iconv-lite-entry";

test('utf8ToGBKPercent test', () => {
    const res = utf8ToGBKPercent('中文测试');
    expect(res).toBe('%D6%D0%CE%C4%B2%E2%CA%D4');
});