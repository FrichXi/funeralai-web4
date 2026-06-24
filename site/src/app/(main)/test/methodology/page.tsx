import type { Metadata } from 'next';
import { ArrowLeft, BarChart3, CheckCircle2, Scale } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageContainer } from '@/components/layout/PageContainer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: '模型分析 - 葬AI Web4',
  description: '葬AI Web4 真实工作任务评测的模型排名与逐项分析。',
  robots: {
    index: false,
    follow: false,
  },
};

const rankings = [
  ['1', 'GLM 5.2', '85.2', '72.8-93.0', '复合分仍第一，视觉和交互分高'],
  ['2', 'Claude Opus 4.8', '84.9', '57.8-98.0', '单站上限最高，低尾拖累均分'],
  ['3', 'Qwen 3.7 Max', '82.4', '66.2-93.8', '图谱渲染稳定，视觉波动大'],
  ['4', 'Kimi K2.7-code', '80.3', '51.6-93.8', '均衡，但也有低分轮次'],
  ['5', 'Doubao Seed 2.1 Pro', '77.6', '55.6-96.0', 'r6 严重抖动后修正，低尾仍明显'],
  ['6', 'MiniMax M3', '77.4', '52.6-95.8', '视觉强，图谱空壳偏多'],
  ['7', 'Step 3.7 Flash', '68.3', '53.0-87.8', '文章完整，图谱和视觉弱轮次偏多'],
  ['8', 'DeepSeek V4 Pro', '67.1', '39.2-96.0', '图谱和视觉稳定性最弱'],
] as const;

const comparison = [
  ['复合均分', '85.2', '84.9', 'GLM 只领先 0.3'],
  ['Adjusted Graph/25', '15.7', '18.4', 'Opus 图谱更强'],
  ['Articles/25', '25.0', '24.6', 'GLM 文章项满分'],
  ['Visual', '18.4', '16.0', 'GLM 视觉更稳定'],
  ['Interaction', '14.8', '13.4', 'GLM 交互分更稳定'],
  ['最低分', '72.8', '57.8', 'Opus 低尾更低'],
] as const;

const modelAnalyses = [
  {
    name: 'GLM 5.2',
    body: 'GLM 5.2 的图谱结果是 6 轮真渲染、4 轮空壳。复合复核里 r10 出现轻微抖动，Graph/25 从 22 调到 20，总分从 93.8 调到 91；但它文章项全满，视觉和交互分普遍高，所以复合均分仍排第一。',
  },
  {
    name: 'Claude Opus 4.8',
    body: 'Opus 4.8 的亮点非常明确：r1 以 98 分拿到全场第一，10 轮里有 8 轮图谱真渲染，调整后图谱均分也高于 GLM。它的问题是波动：r3 是图谱空壳加弱样式，只有 57.8；r10 轻微抖动后从 91 调到 88.2。它不是跑错模型，而是 10 轮里确实出现了更重的低尾。',
  },
  {
    name: 'Qwen 3.7 Max',
    body: 'Qwen 仍然是工程可靠性很强的模型。它的图谱基本能稳定渲染，文章项也接近满分。扣分主要来自视觉和交互波动：有几轮 CSS 变量和设计系统很弱，导致视觉分明显下滑。它不像 Opus 那样有全场最高单站，但整体比较可信。',
  },
  {
    name: 'Kimi K2.7-code',
    body: 'Kimi 的平均表现比较均衡，文章完整性好，好的轮次能到 A 档。但它也有低分轮次，尤其是图谱不可见或样式系统弱的时候会被 graph-weighted 公式明显惩罚。它适合作为稳定候选，但这次不如 Qwen 和前两名。',
  },
  {
    name: 'Doubao Seed 2.1 Pro',
    body: 'Doubao 是追加测试里表现更强的新模型，但复合复核改变了它的关键样本：r6 旧分 100，因知识图谱严重抖动，Graph/25 从 25 调到 17，总分变为 88.8。它仍有 r4、r9 两个 96 分站点，说明上限很高；但 r10 55.6、r5 62 和 r6 抖动一起拉低了复合均分。',
  },
  {
    name: 'MiniMax M3',
    body: 'MiniMax 的视觉设计是明显优势，CSS 变量和页面质感经常很好。但图谱页空壳偏多，graph-weighted 公式放大图谱权重以后，它的总分被压下来。它适合做视觉初稿，但在这个任务里不能只靠好看赢。',
  },
  {
    name: 'Step 3.7 Flash',
    body: 'Step 的文章项稳定，10 轮文章分都是满分，但图谱和视觉弱轮次较多，导致总均分 68.3。它有 r6 87.8、r1 86.8 的可用高分轮次，也有多轮 D 档，当前更像能完成内容结构、但前端图谱和视觉稳定性不足。',
  },
  {
    name: 'DeepSeek V4 Pro',
    body: 'DeepSeek 的最大问题是图谱和视觉稳定性。它也有高分轮次，但低分轮次太低，尤其是图谱不渲染、样式系统弱时会被严重扣分。这个结果更像工程落地稳定性问题，不是单纯能不能写代码的问题。',
  },
] as const;

const takeaways = [
  '10 轮复合均分和单站最高分是两件事。Opus 4.8 的最好产物全场第一，但均分略低于 GLM。',
  'Doubao 和 Step 是追加测试：它们锁定旧数据快照和同一评分脚本加入旧榜，旧 60 行分数没有被改写。',
  '复合评分仍以 graph-weighted 为基础，但额外全量复核图谱稳定性；明显持续抖动会只从 Graph/25 项扣分。',
  'graph-weighted 基础分会强烈惩罚空壳图谱。文章页做完整但图谱不渲染，已经不能拿高分。',
  '这次可以确认 Opus 4.8 使用的是精确模型 claude-opus-4-8，不是 claude-opus-4。',
  '生成条件是对齐的，复合复核也覆盖全部 80 个站点；Doubao 和 Step 的边界是运行日期晚于旧 60 个模型，所以结论仍应读作旧榜追加结果。',
  '旧 graph-weighted 文件保留为归档证据；公开默认总榜、性价比榜和 Round 矩阵使用复合评分。',
] as const;

export default function ModelAnalysisPage() {
  return (
    <>
      <PageContainer className="space-y-10">
        <section className="space-y-4">
          <p className="retro text-[11px] text-muted-foreground">
            PERSONAL REAL-WORK BENCHMARK
          </p>
          <div className="max-w-4xl space-y-4">
            <h1 className="retro text-[24px] text-primary">模型分析</h1>
            <p className="text-sm leading-7 text-muted-foreground">
              这页汇总葬AI Web4 复杂个人网站重构任务的 80 个生成产物结果。排名只说明模型在这套复合评分和 10 轮抽样里的表现，不代表通用模型能力排名。
            </p>
          </div>
          <a
            href="/test/"
            className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>返回测试总榜</span>
          </a>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="retro text-[20px] text-primary">结论概览</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b-4 border-foreground dark:border-ring">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-foreground">排名</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-foreground">模型</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-foreground">10 轮均分</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-foreground">最低到最高</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-foreground">主要判断</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map(([rank, model, average, range, note]) => (
                  <tr key={model} className="border-b border-dashed border-border">
                    <td className="px-2 py-3 text-xs tabular-nums text-primary">{rank}</td>
                    <td className="px-2 py-3 text-xs text-foreground">{model}</td>
                    <td className="px-2 py-3 text-xs tabular-nums text-foreground">{average}</td>
                    <td className="px-2 py-3 text-xs tabular-nums text-muted-foreground">{range}</td>
                    <td className="px-2 py-3 text-xs leading-6 text-muted-foreground">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
            GLM 5.2 比 Claude Opus 4.8 高 0.3 分，差距非常小。这个结果不应该被读成「GLM 整体能力压过 Opus」，更准确地说是：在这套复合评分和 10 轮抽样里，GLM 的平均表现略高。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3 border-y-4 border-foreground py-4 dark:border-ring">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="retro text-[14px] text-primary">同条件生成</h2>
            <p className="text-xs leading-6 text-muted-foreground">
              同一个 prompt、同一套本地数据、同一个网站重构任务、同样 10 轮独立 opencode 会话、同样的产物目录结构。
            </p>
          </div>
          <div className="space-y-3 border-y-4 border-foreground py-4 dark:border-ring">
            <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="retro text-[14px] text-primary">统一复核</h2>
            <p className="text-xs leading-6 text-muted-foreground">
              最终总榜按 graph-weighted 基础分加图谱稳定性复核计算；稳定性扣分只作用于 Graph/25 项。
            </p>
          </div>
          <div className="space-y-3 border-y-4 border-foreground py-4 dark:border-ring">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="retro text-[14px] text-primary">模型确认</h2>
            <p className="text-xs leading-6 text-muted-foreground">
              Claude Opus 4.8 使用精确模型 ID claude-opus-4-8，API 探针的响应模型字段也是 claude-opus-4-8。
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="retro text-[20px] text-primary">测试边界</h2>
          <div className="grid gap-3 text-sm leading-7 text-muted-foreground md:grid-cols-2">
            <p>复合评分的基础仍是 Playwright graph-weighted 复核：loading 15 + graph/25*35 + articles/25*15 + visual 20 + interaction 15。2026-06-24 的新增复核只检测图谱是否在打开后持续抖动，并只调整 Graph/25。</p>
            <p>需要保留的限制是：Doubao 和 Step 是 2026-06-23 追加测试，锁定旧数据快照、旧 prompt 和同一基础评分脚本加入旧榜；2026-06-24 的稳定性复核覆盖全部 80 个站点，而不是只检查新 20 个。</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="retro text-[20px] text-primary">为什么 GLM 5.2 略高于 Opus 4.8</h2>
          <div className="max-w-4xl space-y-3 text-sm leading-7 text-muted-foreground">
            <p>关键不是图谱。Opus 4.8 调整后的图谱均分是 18.4/25，高于 GLM 的 15.7/25；Opus r1 还拿到了全场最高的 98 分。按图谱上限看，Opus 明显很强。</p>
            <p>GLM 赢在平均项和低尾控制。</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b-4 border-foreground dark:border-ring">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-foreground">指标</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-foreground">GLM 5.2</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-foreground">Opus 4.8</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-foreground">解释</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map(([metric, glm, opus, note]) => (
                  <tr key={metric} className="border-b border-dashed border-border">
                    <td className="px-2 py-3 text-xs text-primary">{metric}</td>
                    <td className="px-2 py-3 text-xs tabular-nums text-foreground">{glm}</td>
                    <td className="px-2 py-3 text-xs tabular-nums text-foreground">{opus}</td>
                    <td className="px-2 py-3 text-xs leading-6 text-muted-foreground">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
            Opus 4.8 的 r3 只有 57.8，r6 只有 70.4，r5 只有 75，这几轮把均分拉了下来。GLM 虽然有 4 轮图谱空壳，r10 也因轻微抖动从 93.8 调到 91，但文章项全满，视觉和交互分普遍高，最低分也没有跌破 70，所以平均值略高。0.3 分太窄，不适合下绝对判断。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="retro text-[20px] text-primary">各模型分析</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {modelAnalyses.map((item) => (
              <article key={item.name} className="space-y-3 border-y-4 border-foreground py-4 dark:border-ring">
                <h3 className="retro text-[14px] text-primary">{item.name}</h3>
                <p className="text-xs leading-6 text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="retro text-[20px] text-primary">核心启示</h2>
          <ol className="max-w-4xl list-decimal space-y-3 pl-5 text-sm leading-7 text-muted-foreground">
            {takeaways.map((takeaway) => (
              <li key={takeaway}>{takeaway}</li>
            ))}
          </ol>
        </section>
      </PageContainer>
      <Footer />
    </>
  );
}
