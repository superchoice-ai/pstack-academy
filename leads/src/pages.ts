function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; background: #f3ecdf; color: #1d1914;
    font-family: "Noto Sans Thai", Garuda, "Leelawadee UI", "Sukhumvit Set", Thonburi, Palatino, sans-serif;
    line-height: 1.45;
  }
  a { color: #1c6b4a; }
  .unsub { max-width: 560px; margin: 10vh auto; padding: 28px 24px; background: #fffaf3; border: 1px solid #e4d7c4; }
  .unsub h1 { margin-top: 0; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function unsubscribePage(kind: "ok" | "invalid" | "missing" | "unavailable"): string {
  const blocks = {
    ok: `<h1>ยกเลิกการรับอีเมลแล้ว</h1>
<p>เราจะไม่ส่งอีเมลเกี่ยวกับบริการของ SuperChoice ไปที่อีเมลนี้อีก</p>
<h2>You are unsubscribed</h2>
<p>We will not email you about SuperChoice services again.</p>`,
    invalid: `<h1>ลิงก์ไม่ถูกต้อง</h1>
<p>ลิงก์ยกเลิกรับอีเมลนี้ใช้ไม่ได้ ตอบกลับอีเมลนั้น หรือทัก LINE แล้วบอกว่าไม่ต้องการรับอีเมล</p>
<h2>This unsubscribe link is invalid</h2>
<p>Reply to the email or message us on LINE and we will remove you.</p>`,
    missing: `<h1>ไม่พบรายชื่อนี้</h1>
<p>ลิงก์นี้ลงนามถูกต้อง แต่ไม่มีรายชื่อในระบบแล้ว หากยังได้รับอีเมล ตอบกลับหรือทัก LINE</p>
<h2>This contact was not found</h2>
<p>If you still receive email, reply to it or message us on LINE.</p>`,
    unavailable: `<h1>ระบบยังไม่พร้อม</h1>
<p>ยังบันทึกการยกเลิกไม่ได้ในขณะนี้ ตอบกลับอีเมลหรือทัก LINE เพื่อขอให้หยุดส่ง</p>
<h2>Unsubscribe is temporarily unavailable</h2>
<p>Reply to the email or message us on LINE and we will stop.</p>`,
  } as const;
  return shell(
    "ยกเลิกการรับอีเมล · SuperChoice",
    `<main><article class="unsub">${blocks[kind]}
<p><a href="https://lin.ee/wNUnj5c">LINE</a> · <a href="mailto:superchoice@hotmail.com">superchoice@hotmail.com</a></p>
</article></main>`,
  );
}
