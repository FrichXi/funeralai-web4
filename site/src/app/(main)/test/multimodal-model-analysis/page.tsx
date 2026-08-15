import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Boxes,
  Film,
  FlaskConical,
  Gauge,
  ScanSearch,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '多模态模型两题运行倾向 - 葬AI',
  description: '六模型 3D 白模与四模型 30 秒 MG 动画单轮分析：程序化生产、几何、运动密度、自检与证据边界。',
  robots: { index: false, follow: false },
};

const THREE_D_MODELS = [
  {
    model: 'GPT-5.6 Sol',
    tendency: '决策快，先搭完整生产管线，再做少量关键修正。',
    strengths: '网格水密、单组件；整体叙事与交付效率突出。',
    issues: '体量偏保守且过重，切片 62.65 分钟，刚刚越过硬门槛。',
  },
  {
    model: 'Kimi K3',
    tendency: '工程与质检优先，长时间推导后多轮抽帧、构图和动作修正。',
    strengths: '3D 自动分最高（53/60），水密、单组件，切片 51.29 分钟。',
    issues: '耗时最长，且漏交 README；深度推理没有自动保证交付清单完整。',
  },
  {
    model: 'Qwen 3.8 Max',
    tendency: '强规划、强符号化，把视觉特征拆成明确几何元素，并主动修复预览、法线和索引问题。',
    strengths: '造型特征抓取明确，切片 49.54 分钟。',
    issues: '自述水密，但独立检查仍发现 21 条非流形边、47 个退化三角。',
  },
  {
    model: 'Doubao Seed Evolving',
    tendency: '反复局部修补，日志记录了字体、遮挡、图标、对比度和并行渲染等问题的修正。',
    strengths: '四项媒体硬规格全部通过，执行闭环完整。',
    issues: '人物抽象偏通用，身份特征弱；网格 2 组件，切片 74.45 分钟。',
  },
  {
    model: 'Claude Fable 5',
    tendency: '倾向堆高分辨率、复杂 SDF 与自证文档。',
    strengths: '特征清单完整，脚本组织较工程化。',
    issues: '复杂度失控：48.7 万三角、3157 条非流形边、2822 个退化三角，切片 73.54 分钟；“水密”自述与独立检查冲突。',
  },
  {
    model: 'Grok 4.5',
    tendency: '算法野心大，构建了最长的自制 marching-cubes 管线，并推翻失败首版。',
    strengths: '最终网格水密、单组件。',
    issues: '丢失坐标/打印语义：高度落在 Y 轴、底面稳定性失败，切片 70.46 分钟。',
  },
] as const;

const MG_MODELS = [
  {
    model: 'GPT-5.6 Sol',
    time: '约 5 分 49 秒',
    still: '22.5%',
    reading: '导演、剪辑和故事完成度最好，镜头类型多、起承转合完整；有明显纯色转场，因此近静止比例不是最低。',
  },
  {
    model: 'Kimi K3',
    time: '约 36 分 24 秒',
    still: '13.8%',
    reading: '持续运动最密，角色与剧情衔接稳定；代价是本题运行最慢，并漏交 README。',
  },
  {
    model: 'Qwen 3.8 Max',
    time: '单轮记录',
    still: '61.2%',
    reading: '分镜完整，但更像一组设计良好的关键帧与场景切换，连续动画活动量最低。',
  },
  {
    model: 'Doubao Seed Evolving',
    time: '单轮记录',
    still: '27.2%',
    reading: '动作量不是最低、硬规格也全部完成；短板主要是造型与美术抽象，整体观感最生硬。',
  },
] as const;

function SectionHeading({ icon: Icon, eyebrow, title }: { icon: typeof Boxes; eyebrow: string; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[#2f2938] bg-[#fffaf0]">
        <Icon className="h-4 w-4 text-[#5b3ea7]" aria-hidden="true" />
      </span>
      <div>
        <p className="retro text-[10px] text-[#6d6078]">{eyebrow}</p>
        <h2 className="retro mt-1 text-[20px] leading-8 text-[#5b3ea7]">{title}</h2>
      </div>
    </div>
  );
}

function EvidenceFigure({ src, alt, width, height, caption }: { src: string; alt: string; width: number; height: number; caption: string }) {
  return (
    <figure className="overflow-hidden border-2 border-[#2f2938] bg-[#fffaf0] shadow-[6px_6px_0_#d8cde9]">
      <Image src={src} alt={alt} width={width} height={height} loading="eager" className="h-auto w-full" sizes="(max-width: 768px) 100vw, 1100px" />
      <figcaption className="border-t border-[#d7cfbf] px-4 py-3 text-xs leading-5 text-[#6d6078]">{caption}</figcaption>
    </figure>
  );
}

export default function MultimodalModelAnalysisPage() {
  return <>
    <PageContainer className="space-y-12">
      <header className="space-y-5 border-b-4 border-[#2f2938] pb-7">
        <Link href="/test/" className="inline-flex items-center gap-2 text-xs text-[#5b3ea7] hover:underline"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />返回模型测试</Link>
        <div className="max-w-5xl">
          <p className="retro text-[10px] text-[#6d6078]">MULTIMODAL AGENT · TWO TASKS · SINGLE RUN</p>
          <h1 className="retro mt-2 text-[25px] leading-10 text-[#5b3ea7]">多模态模型两题运行倾向</h1>
          <p className="mt-4 text-sm leading-7 text-[#5b4d66]">同图、同 Prompt、Pi 0.82.0、<code className="border border-[#d7cfbf] bg-[#fffaf0] px-1.5 py-0.5">thinking=max</code>：六模型各跑一轮 3D 白模，四模型各跑一轮 30 秒 MG 动画。证据来自运行日志、生成脚本、统一渲染成品、网格/切片检查与视频逐帧统计。</p>
        </div>
        <div className="flex items-start gap-3 border-2 border-[#2f2938] bg-[#fef3c7] p-4 text-sm leading-7 text-[#713f12]"><ShieldAlert className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><p><b>证据边界：</b>每模型仅一轮，下面是“本轮行为倾向”，不是稳定能力、普遍模型性格或底层架构定论。</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/test/methodology/" className="border border-[#2f2938] bg-[#fffaf0] px-3 py-2 text-xs text-[#5b3ea7] hover:bg-[#ede9fe]">Web4 榜单口径</Link>
          <a href="#three-d" className="border border-[#2f2938] px-3 py-2 text-xs text-[#5b3ea7] hover:bg-[#ede9fe]">六模型 3D</a>
          <a href="#mg" className="border border-[#2f2938] px-3 py-2 text-xs text-[#5b3ea7] hover:bg-[#ede9fe]">四模型 MG</a>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-y-4 border-[#2f2938] py-4"><p className="retro text-[10px] text-[#5b3ea7]">3D TASK</p><p className="mt-2 text-3xl font-semibold">6 模型</p><p className="mt-2 text-xs leading-5 text-[#6d6078]">程序化 SDF / 网格提取路线。</p></div>
        <div className="border-y-4 border-[#2f2938] py-4"><p className="retro text-[10px] text-[#5b3ea7]">MG TASK</p><p className="mt-2 text-3xl font-semibold">4 模型</p><p className="mt-2 text-xs leading-5 text-[#6d6078]">PIL / NumPy 逐帧与 ffmpeg。</p></div>
        <div className="border-y-4 border-[#2f2938] py-4"><p className="retro text-[10px] text-[#5b3ea7]">TOP 3D SCORE</p><p className="mt-2 text-3xl font-semibold">53 / 60</p><p className="mt-2 text-xs leading-5 text-[#6d6078]">Kimi K3，本轮自动评分。</p></div>
        <div className="border-y-4 border-[#2f2938] py-4"><p className="retro text-[10px] text-[#5b3ea7]">DENSEST MOTION</p><p className="mt-2 text-3xl font-semibold">Kimi</p><p className="mt-2 text-xs leading-5 text-[#6d6078]">15 fps 抽样近静止帧 13.8%。</p></div>
      </section>

      <section id="three-d" className="space-y-6 scroll-mt-6">
        <SectionHeading icon={Boxes} eyebrow="PROGRAMMATIC 3D" title="六模型 3D 白模：同题不同取舍" />
        <EvidenceFigure
          src="/images/test/multimodal-20260804/six-models-3d-four-view-grid.png"
          alt="GPT-5.6 Sol、Kimi K3、Qwen 3.8 Max、Doubao Seed Evolving、Claude Fable 5 与 Grok 4.5 的统一 3D 白模四视图对比"
          width={2400}
          height={2390}
          caption="六模型统一四视图。图像用于观察造型与几何呈现；水密、组件数、非流形边和切片时间来自独立检查，不从画面主观猜测。"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {THREE_D_MODELS.map((item) => <article key={item.model} className="border-2 border-[#2f2938] bg-[#fffaf0] p-4 shadow-[4px_4px_0_#d8cde9]"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#5b3ea7]" aria-hidden="true" /><h3 className="text-lg font-semibold text-[#17131d]">{item.model}</h3></div><p className="mt-3 text-sm font-medium leading-6 text-[#332b3d]">{item.tendency}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="border border-[#d7cfbf] bg-white/60 p-3"><p className="retro text-[9px] text-[#047857]">观察到的优势</p><p className="mt-2 text-xs leading-5 text-[#5b4d66]">{item.strengths}</p></div><div className="border border-[#d7cfbf] bg-white/60 p-3"><p className="retro text-[9px] text-[#9a3412]">本轮问题</p><p className="mt-2 text-xs leading-5 text-[#5b4d66]">{item.issues}</p></div></div></article>)}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading icon={ScanSearch} eyebrow="QWEN COUNTEREXAMPLE" title="“硬眉毛”不能证明 VL / LLM 分离" />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <EvidenceFigure
            src="/images/test/multimodal-20260804/qwen38-formal-vs-preview-3d-four-view.png"
            alt="Qwen 3.8 Max 正式版在上、Preview 在下的 3D 白模四视图对比"
            width={1200}
            height={1520}
            caption="正式版在上、Preview 在下。严格旧题 A/B：3D 为 48/60 对 55/60；单轮不能宣称正式版已全面提升。"
          />
          <div className="space-y-4 text-sm leading-7 text-[#5b4d66]">
            <p>本轮更直接的解释在生成脚本里：Qwen 在 <code className="border border-[#d7cfbf] bg-[#fffaf0] px-1.5 py-0.5">build_model.py</code> 中把闭眼弧显式写成裁切后的 <code className="border border-[#d7cfbf] bg-[#fffaf0] px-1.5 py-0.5">torus_y</code>，再用较小的平滑并集接到脸上，因此轮廓天然更硬、边界更清楚。</p>
            <p>其他模型也走了“看图 → 文字/代码规划 → SDF 基元 → 网格”的相近路线，只是选择凹刻椭球、球链或更强平滑。图像能支持的有限结论是：<b className="text-[#17131d]">Qwen 本轮倾向把视觉特征离散成清晰、可命名、可编程的符号，并偏爱硬边几何基元。</b></p>
            <div className="border-l-4 border-[#ef4444] bg-[#fef2f2] p-4 text-[#7f1d1d]"><b>不能由此证明：</b>服务端一定是“小视觉模型先描述，再喂文本模型”；也不能区分独立 VL/LLM、视觉编码器接入统一主干或其他实现。</div>
            <p>若要验证架构假设，应设计保留连续视觉信息的反事实题：只改变微妙曲率、遮挡和材质，不改变可命名语义，再观察错误是否稳定呈现“文字摘要瓶颈”。</p>
          </div>
        </div>
      </section>

      <section id="mg" className="space-y-6 scroll-mt-6">
        <SectionHeading icon={Film} eyebrow="30-SECOND MOTION GRAPHICS" title="四模型 MG：故事完成度与运动密度要分开" />
        <EvidenceFigure
          src="/images/test/multimodal-20260804/four-models-mg-representative-frames.png"
          alt="GPT-5.6 Sol、Kimi K3、Qwen 3.8 Max 与 Doubao Seed Evolving 的 30 秒 MG 动画精选代表帧"
          width={1440}
          height={722}
          caption="四模型动画代表帧。静态拼图用于展示造型、构图和场景；持续运动判断来自视频逐帧变化统计。"
        />
        <div className="overflow-x-auto border-2 border-[#2f2938] bg-[#fffaf0]">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead className="border-b-2 border-[#2f2938] bg-[#f5f1e8]"><tr><th className="px-3 py-2 text-left">模型</th><th className="px-3 py-2 text-left">本轮时间</th><th className="px-3 py-2 text-right">近静止帧</th><th className="px-3 py-2 text-left">证据化解读</th></tr></thead>
            <tbody>{MG_MODELS.map((item) => <tr key={item.model} className="border-b border-[#d7cfbf] last:border-0"><td className="px-3 py-3 font-semibold text-[#17131d]">{item.model}</td><td className="px-3 py-3 text-[#5b4d66]">{item.time}</td><td className="px-3 py-3 text-right font-semibold tabular-nums text-[#5b3ea7]">{item.still}</td><td className="px-3 py-3 leading-5 text-[#5b4d66]">{item.reading}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="flex items-start gap-3 border border-[#d7cfbf] bg-[#fffaf0] p-4 text-sm leading-7 text-[#5b4d66]"><Gauge className="mt-1 h-4 w-4 shrink-0 text-[#5b3ea7]" aria-hidden="true" /><p>逐帧变化只是运动密度代理，不等于审美评分。更准确的本轮表述是：<b className="text-[#17131d]">GPT 的导演、剪辑和故事完成度最好；Kimi 的连续动画活动量最高；Qwen 最偏关键帧/场景切换；豆包的主要短板是造型与美术质量，不是没有动起来。</b></p></div>
      </section>

      <section className="space-y-6">
        <SectionHeading icon={FlaskConical} eyebrow="WHAT THIS SAMPLE SUPPORTS" title="可以得到什么，不能得到什么" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border-2 border-[#2f2938] bg-[#fffaf0] p-4"><h3 className="font-semibold text-[#17131d]">本轮材料支持</h3><ol className="mt-3 space-y-3 text-sm leading-7 text-[#5b4d66]"><li>1. 两题主要测多模态 Agent 的程序化生产能力，不是原生 3D/视频生成能力；环境与题面强烈塑造了解法。</li><li>2. “会自检”与“自检有效”必须分开；Qwen、Fable 的自述与独立拓扑检查出现冲突。</li><li>3. 能力至少分为整体叙事/效率、持续动画、几何工程、显式规划/符号化、局部修补等轴。</li><li>4. Qwen 正式版暂不能宣称较 Preview 提升：旧题 3D 48/60 对 55/60，宣传片 SSIM 0.7781 对 0.7886，均为 Preview 略高。</li></ol></div>
          <div className="border-2 border-[#2f2938] bg-[#fffaf0] p-4"><h3 className="font-semibold text-[#17131d]">下一轮应补</h3><ol className="mt-3 space-y-3 text-sm leading-7 text-[#5b4d66]"><li>1. 每模型至少 3 次，区分偶然代码策略与稳定行为。</li><li>2. 增加人工盲评，避免自动指标替代相似度与审美判断。</li><li>3. 3D 将人物相似度、几何合法性、打印成本拆开。</li><li>4. 视频将故事完整度、持续运动、角色一致性、转场节奏拆开。</li></ol><div className="mt-4 border-l-4 border-[#f59e0b] bg-[#fff7ed] p-3 text-xs leading-6 text-[#7c2d12]">一次轨迹只能写成“本轮观察”。模型自述是待验证材料，不是事实；从行为反推内部架构则是更低证据等级的假设。</div></div>
        </div>
      </section>
    </PageContainer>
    <Footer />
  </>;
}
