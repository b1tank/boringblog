import { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于",
  description: "关于乐之翁博客",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">关于本站</h1>

      <div className="prose-custom space-y-6 text-[0.9375rem] leading-relaxed text-foreground">
        <p>
          <strong>乐之翁</strong>，一个安静的个人博客。
        </p>

        <p>
          这里记录生活中的所思所想、读书笔记、旅行见闻，以及一些值得分享的经验与感悟。
          不追热点，不求流量，只愿以文字留住时光，与有缘人分享。
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">关于博主</h2>
        <p>
          一位热爱生活、喜欢用文字记录点滴的普通人。
          相信好的文章不在于辞藻华丽，而在于真诚与用心。
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">联系方式</h2>
        <p className="text-muted">
          如有问题或建议，欢迎通过博客留言或邮件联系。
        </p>
      </div>
    </div>
  );
}
