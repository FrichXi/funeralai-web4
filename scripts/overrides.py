"""
Declarative override rules for post-processing the knowledge graph.
All domain knowledge that Gemini cannot extract goes here.

This is a PURE DATA file -- no logic, just declarations.
"""

# ── Excluded articles (skipped during aggregation & article index) ──
EXCLUDED_ARTICLES = {"011"}  # 011: B站发起视频播客，与AI无关

# ── Node merges (post-extraction, for cases MERGE_MAP can't handle) ──
# Format: {"keep": canonical_id, "remove": [alias_ids],
#          "new_name": optional, "add_aliases": optional, "new_type": optional}
NODE_MERGES = [
    # -- 1a. New merges (4 groups) --
    {"keep": "looki", "remove": ["looki公司"]},
    {"keep": "manus", "remove": ["manus-产品"]},
    {"keep": "锴杰", "remove": ["陈总"], "new_name": "陈锴杰", "add_aliases": ["锴杰", "陈总"]},
    {"keep": "openclaw", "remove": ["clawdbot"]},

    # -- 1b. Person merges (3 groups) --
    {"keep": "kaiyi", "remove": ["鹤岗凯一", "孙先生"],
     "add_aliases": ["鹤岗凯一", "孙先生", "凯一"]},
    {"keep": "钟十六", "remove": ["钟经纬"]},
    {"keep": "travis-kalanick", "remove": ["uber创始人"]},

    # -- 1c. Company merges (6 groups) --
    {"keep": "阿里巴巴", "remove": ["阿里"], "add_aliases": ["阿里"]},
    {"keep": "阶跃星辰", "remove": ["阶跃"], "add_aliases": ["阶跃"]},
    {"keep": "谷歌", "remove": ["google"], "add_aliases": ["Google", "google"]},
    {"keep": "商汤科技", "remove": ["商汤"], "add_aliases": ["商汤"]},
    {"keep": "红杉资本", "remove": ["红杉"], "add_aliases": ["红杉"]},
    {"keep": "千里科技", "remove": ["千里"], "add_aliases": ["千里"]},

    # -- 1d. Product merges (10 groups) --
    {"keep": "qwen", "remove": ["千问", "通义大模型", "通义"],
     "add_aliases": ["千问", "通义大模型", "通义"]},
    {"keep": "阶跃桌面伙伴", "remove": ["阶跃桌面助手", "阶跃电脑助手"],
     "add_aliases": ["阶跃桌面助手", "阶跃电脑助手"]},
    {"keep": "flowith-os", "remove": ["flowith"],
     "add_aliases": ["flowith", "Flowith"]},
    {"keep": "海螺ai", "remove": ["海螺"], "add_aliases": ["海螺"]},
    {"keep": "钉钉a1", "remove": ["钉钉a1录音卡", "a1"],
     "add_aliases": ["a1"]},
    {"keep": "chatgpt-deep-research", "remove": ["deep-research"],
     "add_aliases": ["Deep Research"]},
    {"keep": "manus", "remove": ["manus-agents"]},
    {"keep": "kimi", "remove": ["k2"], "add_aliases": ["K2", "Kimi K2"]},
    {"keep": "openclaw", "remove": ["云端openclaw"],
     "add_aliases": ["云端OpenClaw"]},
    {"keep": "火山引擎", "remove": ["火山"], "add_aliases": ["火山"]},

    # -- 1e. New duplicates found in v3 extraction --
    {"keep": "manus", "remove": ["manus产品"], "add_aliases": ["Manus产品"]},
    {"keep": "qwen", "remove": ["通义千问", "通义app"],
     "add_aliases": ["通义千问", "通义APP"]},
    {"keep": "马卡龙", "remove": ["马卡龙app"], "add_aliases": ["马卡龙APP"]},
    {"keep": "云从", "remove": ["云从科技"], "add_aliases": ["云从科技"]},
    {"keep": "旷视", "remove": ["旷视科技"], "add_aliases": ["旷视科技"]},
    {"keep": "妙鸭相机", "remove": ["妙鸭"], "add_aliases": ["妙鸭"]},
    {"keep": "锴杰", "remove": ["马卡龙创始人"], "add_aliases": ["马卡龙创始人"]},
    {"keep": "川普", "remove": ["特朗普"], "add_aliases": ["特朗普", "Trump"]},

    # -- 1f. New merges (v4) --
    {"keep": "蚂蚁集团", "remove": ["支付宝"], "add_aliases": ["支付宝"]},

    # -- 1g. New merges (v5) --
    {"keep": "idg", "remove": ["idg-90后基金"], "add_aliases": ["IDG 90后基金"]},
    # 钉钉/阿里云 are separate business units, keep as independent nodes in graph
    {"keep": "葬ai", "remove": ["葬爱咸鱼科技有限公司"], "add_aliases": ["葬爱咸鱼科技有限公司"]},

    # -- 1h. New merges (v6) --
    {"keep": "蚂蚁集团", "remove": ["蚂蚁"], "add_aliases": ["蚂蚁", "蚂蚁金服"]},
    {"keep": "蚂蚁集团", "remove": ["蚂蚁集团投资部"], "add_aliases": ["蚂蚁集团投资部"]},
    {"keep": "vivix", "remove": ["vivix-ai"], "add_aliases": ["Vivix AI"]},
]

# ── Type corrections ──
# Key = node_id (lowercase), value = correct type
TYPE_CORRECTIONS = {
    # ensure product (user feedback: Plaud/YouWare/Looki/Agnes/MyShell/Rokid must be product)
    "plaud": "product",
    "looki": "product",
    "youware": "product",
    "myshell": "product",
    "agnes": "product",
    "rokid": "product",
    # other type fixes
    "ebay": "company",
    "faceu": "company",
    "taku": "product",
    # company -> vc_firm
    "a16z": "vc_firm",
    "idg": "vc_firm",
    "高瓴": "vc_firm",
    "锦秋基金": "vc_firm",
    "五源": "vc_firm",
    "红杉资本": "vc_firm",
    "金沙江": "vc_firm",
    "benchmark": "vc_firm",
}

# ── Edge type fixes ──
# Format: (source_id, target_id, old_type, fix_dict)
# fix_dict keys: "new_type", "new_source", "new_target", "delete", "label"
#
# Section 4.1: works_on -> founder_of
# Section 4.2: works_on -> works_at (with potential target change)
# Section 4.3: mentors -> invests_in
# Section 4.4: founder_of target-is-product fixes
# Section 4.5: develops source-is-product fixes
# Section 4.6: Other edge fixes
EDGE_TYPE_FIXES = [
    # -- 4.1 works_on -> founder_of --
    ("明超平", "youware", "works_on", {"new_type": "founder_of"}),
    ("景鲲", "genspark", "works_on", {"new_type": "founder_of"}),
    ("肖弘", "manus", "works_on", {"new_type": "founder_of"}),
    ("许高", "plaud", "works_on", {"new_type": "founder_of"}),
    ("dereknee", "flowith-os", "works_on", {"new_type": "founder_of"}),
    ("论论创始人", "论论", "works_on", {"new_type": "founder_of"}),
    ("锴杰", "马卡龙", "works_on", {"new_type": "founder_of"}),
    ("瓦总", "即刻", "works_on", {"new_type": "founder_of"}),

    # -- 4.2 works_on -> works_at (with potential target change) --
    ("杨植麟", "kimi", "works_on", {"new_type": "works_at", "new_target": "月之暗面"}),
    ("付铖", "mulerun", "works_on", {"new_type": "works_at"}),
    ("wels", "head-ai", "works_on", {"new_type": "works_at"}),
    ("钟十六", "阶跃桌面伙伴", "works_on", {"new_type": "works_at", "new_target": "阶跃星辰"}),
    ("kaiyi", "manus", "works_on", {"new_type": "works_at"}),
    ("邪恶意大利人", "claude", "works_on", {"new_type": "works_at", "new_target": "anthropic"}),
    ("马斯克", "推特", "works_on", {"new_type": "works_at"}),
    ("张予彤", "kimi", "works_on", {"new_type": "works_at", "new_target": "月之暗面"}),
    ("张予彤", "kimi", "works_at", {"new_type": "works_at", "new_target": "月之暗面"}),
    ("许高", "plaud", "works_on", {"new_type": "works_at"}),
    ("约小亚", "商业就是这样", "works_on", {"new_type": "works_at"}),
    ("圆脸眼镜哥", "atoms", "works_on", {"new_type": "works_at"}),
    ("闹闹", "oiioii", "works_on", {"new_type": "works_at"}),

    # -- 4.3 mentors -> invests_in --
    ("百度", "张月光", "mentors", {"new_type": "invests_in"}),
    ("刘元", "肖弘", "mentors", {"new_type": "invests_in"}),
    ("锦秋基金", "王登科", "mentors", {"new_type": "invests_in"}),
    ("idg", "孙宇晨", "mentors", {"new_type": "invests_in"}),
    ("idg", "齐俊元", "mentors", {"new_type": "invests_in"}),

    # -- 4.4 founder_of where target is product -> works_on --
    ("张小龙", "微信", "founder_of", {"new_type": "works_on"}),

    # -- 4.5 develops where source is product -> change source to company --
    ("kimi", "kimi-api", "develops", {"new_source": "月之暗面"}),
    ("kimi", "kimi-claw", "develops", {"new_source": "月之暗面"}),
    ("kimi", "kimi-code", "develops", {"new_source": "月之暗面"}),
    ("faceu", "剪映", "develops", {"new_source": "字节跳动"}),

    # -- 4.6 Other edge fixes --
    ("王登科", "独响", "develops", {"new_type": "founder_of"}),
    ("孙洋", "looki", "works_on", {"new_type": "works_at"}),
    ("月之暗面", "明超平", "collaborates_with", {"delete": True}),
    ("月之暗面", "明超平", "invests_in", {"delete": True}),
    ("反诈助手", "马卡龙", "integrates_with", {
        "new_source": "马卡龙", "new_target": "反诈助手",
        "new_type": "develops", "label": "马卡龙开发反诈助手",
    }),
]

# ── Additional edges to add after edge fixes (not in standard fix format) ──
# These are edges that need to be ensured to exist after step 4 processing.
# Format: (source_id, target_id, relation_type, label)
EDGE_FIX_ADDITIONS = [
    # peak -> manus: add works_at (keep existing works_on)
    ("peak", "manus", "works_at", "Peak在Manus工作"),
    # 明超平 -> 月之暗面: add works_at
    ("明超平", "月之暗面", "works_at", "明超平在月之暗面工作"),
    # Robin (李彦宏): add founder_of -> 百度
    ("robin", "百度", "founder_of", "李彦宏创立百度"),
]

# ── Missing edges (Gemini can't infer these) ──
# Format: (source_id, target_id, relation_type, label)
MISSING_EDGES = [
    # -- 5.1 User-specified --
    ("邪恶意大利人", "马斯克", "competes_with", "Anthropic与xAI竞争"),
    ("邪恶意大利人", "sam-altman", "competes_with", "Anthropic与OpenAI竞争"),
    ("钟十六", "阶跃星辰", "works_at", "钟十六在阶跃星辰工作"),
    ("钟十六", "印奇", "collaborates_with", "钟十六与印奇合作"),
    ("wels", "杨洁", "collaborates_with", "Wels与杨洁合作"),

    # -- 5.2 Description-inferred founder_of/works_at --
    ("sam-altman", "openai", "founder_of", "Sam Altman创立OpenAI"),
    ("乔布斯", "苹果", "founder_of", "乔布斯创立苹果"),
    ("吴永辉", "谷歌", "works_at", "吴永辉在谷歌工作"),
    ("吴泳铭", "阿里巴巴", "works_at", "吴泳铭在阿里巴巴工作"),
    ("孙洋", "looki", "founder_of", "孙洋创立Looki"),
    ("橘子", "listenhub", "founder_of", "橘子创立ListenHub"),
    ("王登科", "独响", "founder_of", "王登科创立独响"),
    ("玉伯", "youmind", "founder_of", "玉伯创立YouMind"),
    ("戴宗宏", "百川智能", "co_founded", "戴宗宏联合创立百川智能"),
    ("谷雪梅", "零一万物", "co_founded", "谷雪梅联合创立零一万物"),
    ("erlich", "proma", "works_on", "Erlich参与Proma"),
    ("peak", "manus", "works_on", "Peak参与Manus"),
    ("邪恶意大利人", "anthropic", "founder_of", "Dario Amodei创立Anthropic"),
    ("郭列", "脸萌", "founder_of", "郭列创立脸萌"),
    ("杨通", "千里科技", "founder_of", "杨通创立千里科技"),
    ("闫俊杰", "minimax", "founder_of", "闫俊杰创立MiniMax"),

    # -- 5.3 Missing parent-child develops --
    ("openai", "sora", "develops", "OpenAI开发Sora"),
    ("谷歌", "gemini", "develops", "谷歌开发Gemini"),
    ("谷歌", "google-deepmind", "develops", "谷歌旗下Google DeepMind"),
    ("苹果", "siri", "develops", "苹果开发Siri"),
    ("腾讯", "微信", "develops", "腾讯开发微信"),
    ("腾讯", "绝悟-ai", "develops", "腾讯开发绝悟AI"),
    ("腾讯", "腾讯-ai-lab", "develops", "腾讯旗下AI Lab"),
    ("字节跳动", "火山引擎", "develops", "字节跳动开发火山引擎"),
    ("字节跳动", "抖音极速版", "develops", "字节跳动开发抖音极速版"),
    ("阿里巴巴", "淘宝", "develops", "阿里巴巴开发淘宝"),

    # -- 5.4 Other missing edges from articles --
    ("阿里巴巴", "杨植麟", "invests_in", "阿里巴巴投资杨植麟/月之暗面"),
    ("五源", "雷军", "invests_in", "五源投资雷军"),
    ("idg", "郭列", "invests_in", "IDG投资郭列"),
    ("特朗普", "马斯克", "collaborates_with", "特朗普与马斯克合作"),
    ("刘芹", "雷军", "collaborates_with", "刘芹与雷军合作"),
    ("peak", "肖弘", "co_founded", "Peak与肖弘联合创立Manus"),

    # -- 5.5 New user-specified edges (v4) --
    ("idg", "拓竹", "invests_in", "IDG投资拓竹"),
    ("红杉资本", "观猹", "invests_in", "红杉资本投资观猹"),
    ("红杉资本", "小红书", "invests_in", "红杉中国投资小红书"),
    ("idg", "vivix", "invests_in", "IDG投资Vivix"),
    ("阿里巴巴", "阿里达摩院", "develops", "阿里巴巴旗下达摩院"),
    ("阿里巴巴", "qoder", "develops", "阿里巴巴开发Qoder编程工具"),
    ("openai", "codex", "develops", "OpenAI开发Codex编程工具"),
    ("腾讯", "正版qq小冰", "develops", "腾讯旗下正版QQ小冰"),
    ("阿里巴巴", "蚂蚁集团", "develops", "阿里巴巴旗下蚂蚁集团"),
    ("葬爱咸鱼", "36氪", "collaborates_with", "葬爱咸鱼是36氪CEO候选人"),
    ("蚂蚁集团", "自然选择", "invests_in", "蚂蚁集团投资自然选择"),
    # ("蚂蚁集团", "蚂蚁集团投资部", ...) -- removed: merged into 蚂蚁集团
    ("龚震", "闪电说", "founder_of", "龚震创办闪电说"),
    ("龚震", "manus", "works_at", "龚震曾在Manus工作"),

    # -- 5.6 Systematic review: missing develops (parent-child) --
    ("阿里巴巴", "夸克", "develops", "阿里巴巴开发夸克搜索引擎"),
    ("阿里巴巴", "钉钉", "develops", "阿里巴巴开发钉钉"),
    ("阿里巴巴", "qwen-code", "develops", "阿里巴巴开发Qwen Code编程Agent"),
    ("字节跳动", "飞书", "develops", "字节跳动开发飞书"),
    ("字节跳动", "豆包手机", "develops", "字节跳动开发豆包手机"),
    ("腾讯", "元宝", "develops", "腾讯开发元宝AI"),
    ("openai", "whisper", "develops", "OpenAI开发Whisper语音识别模型"),
    ("谷歌", "gemini-cli", "develops", "谷歌开发Gemini CLI"),
    ("xai", "grok", "develops", "xAI开发Grok"),
    ("meta", "instagram", "develops", "Meta开发Instagram"),
    ("快手", "可灵", "develops", "快手开发可灵AI视频生成"),
    ("智谱ai", "glm-code", "develops", "智谱AI开发GLM Code编程Agent"),
    ("叠纸", "恋与深空", "develops", "叠纸开发恋与深空"),

    # -- 5.7 Systematic review: missing invests_in --
    ("锦秋基金", "manus", "invests_in", "锦秋基金投资Manus"),

    # -- 5.8 Systematic review: missing competes_with --
    ("codex", "cursor", "competes_with", "Codex和Cursor都是AI编程工具"),
    ("seedance", "可灵", "competes_with", "Seedance和可灵都是AI视频生成产品"),
    ("qwen", "kimi", "competes_with", "千问和Kimi都是国内AI对话助手"),
    ("qwen", "deepseek", "competes_with", "千问和DeepSeek都是国内AI大模型"),
    ("豆包", "kimi", "competes_with", "豆包和Kimi都是国内AI对话助手"),
    ("豆包", "deepseek", "competes_with", "豆包和DeepSeek都是国内AI大模型"),
    ("plaud", "looki", "competes_with", "Plaud和Looki都是AI硬件产品"),
    ("youmind", "notebooklm", "competes_with", "YouMind和NotebookLM都是AI知识管理产品"),
    ("腾讯云", "火山引擎", "competes_with", "腾讯云和火山引擎都是云服务平台"),
    ("chatpods", "来福电台", "competes_with", "ChatPods和来福电台都是AI播客产品"),
    ("deepseek", "minimax", "competes_with", "DeepSeek和MiniMax都是国内AI大模型公司"),
    ("deepseek", "百川智能", "competes_with", "DeepSeek和百川智能都是国内AI大模型公司"),
    ("deepseek", "阶跃星辰", "competes_with", "DeepSeek和阶跃星辰都是国内AI大模型公司"),
    ("deepseek", "月之暗面", "competes_with", "DeepSeek和月之暗面都是国内AI大模型公司"),
    ("minimax", "百川智能", "competes_with", "MiniMax和百川智能都是国内AI大模型公司"),
    ("月之暗面", "百川智能", "competes_with", "月之暗面和百川智能都是国内AI大模型公司"),
    ("月之暗面", "minimax", "competes_with", "月之暗面和MiniMax都是国内AI大模型公司"),
    ("月之暗面", "智谱ai", "competes_with", "月之暗面和智谱AI都是国内AI大模型公司"),
    ("anthropic", "openai", "competes_with", "Anthropic和OpenAI都是美国顶级AI公司"),

    # -- 5.9 葬AI author relationships --
    ("葬爱咸鱼", "葬ai", "works_at", "葬爱咸鱼是葬AI的创始人和作者"),
    ("葬爱咸鱼", "葬ai", "founder_of", "葬爱咸鱼创立葬AI"),
    ("沐秋", "葬ai", "works_at", "沐秋是葬AI的作者"),
    ("骡子马", "葬ai", "works_at", "骡子马是葬AI的作者"),
    ("葬爱咸鱼", "沐秋", "collaborates_with", "葬爱咸鱼与沐秋在葬AI合作"),
    ("葬爱咸鱼", "骡子马", "collaborates_with", "葬爱咸鱼与骡子马在葬AI合作"),
    ("沐秋", "骡子马", "collaborates_with", "沐秋与骡子马在葬AI合作"),

    # -- 5.10 Missing develops edges (orphan products → parent) --
    ("deepseek", "deepseek-r1", "develops", "DeepSeek开发DeepSeek-R1"),
    ("deepseek", "deepseek-v3", "develops", "DeepSeek开发DeepSeek-V3"),
    ("商汤科技", "sensetime-日日新", "develops", "商汤科技开发日日新大模型"),
]

# ── Alias cleanup ──

# Alias removal rules: node_id -> predicate description + values to match
# Format: (node_id, aliases_to_remove)
ALIAS_REMOVALS = [
    ("minimax", ["胖猫"]),          # remove any alias containing 胖猫
    ("kimi", ["月之暗面"]),          # exact match
    ("钟十六", ["小登"]),            # exact match
    ("dingtalk-real", ["Real"]),    # exact match
    ("shellagent", ["Agent"]),     # exact match
    ("钉钉a1", ["A1"]),            # exact match
    ("gemini-cli", ["Gemini"]),    # exact match
]

# Alias additions: node_id -> aliases to add
ALIAS_ADDITIONS = {
    "qwen": ["千问"],
    "flowith-os": ["flowith"],
    "阿里巴巴": ["阿里"],
    "阶跃星辰": ["阶跃"],
    "阶跃桌面伙伴": ["阶跃桌面助手"],
    "商汤科技": ["商汤"],
    "谷歌": ["google", "Google"],
    "红杉资本": ["红杉"],
    "kimi": ["k2", "K2"],
    "钉钉a1": ["a1"],
}

# Node renames: (node_id, new_name, new_aliases)
NODE_RENAMES = [
    ("rokid创始人", "祝铭明", ["Misa", "Rokid创始人"]),
]

# Extra alias additions for specific nodes
EXTRA_ALIAS_ADDITIONS = [
    ("邪恶意大利人", ["Dario Amodei", "Dario"]),
]

# ── Missing nodes (not extracted by Gemini) ──
# These are added before any other processing step.
MISSING_NODES = [
    {"id": "龚震", "name": "龚震", "type": "person",
     "description": "闪电说创始人，曾在Manus工作"},
    {"id": "闪电说", "name": "闪电说", "type": "product",
     "description": "AI演讲辅助产品"},
    {"id": "葬ai", "name": "葬AI", "type": "company",
     "description": "中文AI行业评论自媒体"},
]

# ── Description overrides (neutral rewording) ──
DESCRIPTION_OVERRIDES = {
    "agnes": "Agnes AI发布的主打\"平民agent\"的AI对话与生产工具应用，产品设计引发行业争议",
    "杨通": "开为科技及Agnes AI创始人，因产品相似度争议受到行业关注",
}

# ── Symmetric relation types (need bidirectional edges) ──
BIDIRECTIONAL_RELATION_TYPES = ["competes_with", "compares_to"]

# ── Company subsidiary consolidation (leaderboard only, NOT graph) ──
# Parent company ID -> list of subsidiary node IDs whose stats merge into parent.
# Graph visualization remains unchanged; only leaderboard ranking is affected.
# Merge logic: degree=sum, mention_count=sum, article_count=union(去重).
COMPANY_SUBSIDIARIES = {
    "阿里巴巴": ["阿里云", "钉钉", "蚂蚁集团", "阿里达摩院"],
    "字节跳动": ["火山引擎", "脸萌科技"],
    "腾讯": ["腾讯-ai-lab"],
    "谷歌": ["google-deepmind"],
}

# ── Leaderboard exclusions ──
# Node IDs excluded from specific leaderboard categories.
# 葬AI authors are not industry founders; their founder_of edge to 葬AI
# is an internal relationship, not a startup founding.
LEADERBOARD_EXCLUDE = {
    "founders": ["葬爱咸鱼", "沐秋", "骡子马"],
}
