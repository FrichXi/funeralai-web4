"""
Declarative override rules for post-processing the knowledge graph.
All domain knowledge that Gemini cannot extract goes here.

This is a PURE DATA file -- no logic, just declarations.
"""

# ── Node merges (post-extraction, for cases MERGE_MAP can't handle) ──
# Format: {"keep": canonical_id, "remove": [alias_ids],
#          "new_name": optional, "add_aliases": optional, "new_type": optional}
NODE_MERGES = [
    # -- 1a. New merges (4 groups) --
    {"keep": "looki", "remove": ["looki公司"]},
    {"keep": "manus", "remove": ["manus-产品"]},
    {"keep": "锴杰", "remove": ["陈总"]},
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
    "idg-90后基金": "vc_firm",
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
    ("idg-90后基金", "郭列", "invests_in", "IDG 90后基金投资郭列"),
    ("特朗普", "马斯克", "collaborates_with", "特朗普与马斯克合作"),
    ("刘芹", "雷军", "collaborates_with", "刘芹与雷军合作"),
    ("peak", "肖弘", "co_founded", "Peak与肖弘联合创立Manus"),
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

# ── Symmetric relation types (need bidirectional edges) ──
BIDIRECTIONAL_RELATION_TYPES = ["competes_with", "compares_to"]
