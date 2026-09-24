This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Chế độ Shadowing (đoạn văn do AI viết)

Trong tab **Gõ → Shadowing**, server gọi model để viết 1–3 đoạn văn tiếng Trung dùng đủ từ vựng
của bài hiện tại và lồng thêm từ của các bài trước, kèm bản dịch tiếng Việt. Pinyin do `pinyin-pro`
tính ngay trên máy. Đoạn văn được lưu trong `localStorage` theo từng bài nên không tốn token khi
học lại.

Cấu hình model bằng biến môi trường (chuẩn OpenAI, dùng SDK `openai` ở server — API key không bao
giờ gửi xuống trình duyệt). Sao chép `.env.example` thành `.env.local`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1   # tuỳ chọn: đổi provider/model local
```

Route xử lý: `POST /api/ai/chat` (proxy gọi model), `GET /api/ai/chat` (kiểm tra đã cấu hình chưa).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
