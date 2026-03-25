"""Tests for graph_utils.py pure functions."""
import pytest

from graph_utils import (
    canonicalize_name,
    count_mentions_in_text,
    is_blacklisted_name,
    normalize_entity_type,
    normalize_relation_type,
    sanitize_id,
)


class TestSanitizeId:
    def test_basic_lowercase(self):
        assert sanitize_id("ChatGPT") == "chatgpt"

    def test_chinese(self):
        assert sanitize_id("月之暗面") == "月之暗面"

    def test_spaces_become_hyphens(self):
        assert sanitize_id("Sam Altman") == "sam-altman"

    def test_special_chars_stripped(self):
        assert sanitize_id("a16z (fund)") == "a16z-fund"

    def test_leading_trailing_hyphens_stripped(self):
        assert sanitize_id("--test--") == "test"

    def test_empty_string(self):
        assert sanitize_id("") == ""


class TestCanonicalizeName:
    def test_exact_merge_map_hit(self):
        assert canonicalize_name("阿里") == "阿里巴巴"

    def test_case_insensitive_merge(self):
        assert canonicalize_name("deepseek") == "DeepSeek"

    def test_unknown_name_passthrough(self):
        result = canonicalize_name("SomeUnknownEntity12345")
        assert result == "SomeUnknownEntity12345"

    def test_empty_string(self):
        assert canonicalize_name("") == ""

    def test_none(self):
        assert canonicalize_name(None) == ""

    def test_whitespace_stripped(self):
        assert canonicalize_name("  ChatGPT  ") == "ChatGPT"


class TestNormalizeRelationType:
    def test_known_alias(self):
        assert normalize_relation_type("创始人") == "founder_of"

    def test_known_canonical(self):
        assert normalize_relation_type("competes_with") == "competes_with"

    def test_unknown_falls_to_related(self):
        assert normalize_relation_type("unknown_type") == "related"

    def test_empty_string(self):
        assert normalize_relation_type("") == "related"

    def test_none(self):
        assert normalize_relation_type(None) == "related"


class TestNormalizeEntityType:
    def test_type_override(self):
        assert normalize_entity_type("ChatGPT", "company") == "product"

    def test_type_alias(self):
        assert normalize_entity_type("SomeCompany", "organization") == "company"

    def test_vc_firm_alias(self):
        assert normalize_entity_type("SomeFund", "投资机构") == "vc_firm"

    def test_description_hint_person(self):
        assert normalize_entity_type("Someone", None, "某公司创始人") == "person"

    def test_returns_none_for_unknown(self):
        result = normalize_entity_type("X", "unknown_type_xyz")
        # May return None or infer from name
        assert result is None or result in ("company", "product", "person", "vc_firm")


class TestIsBlacklistedName:
    def test_exact_blacklist(self):
        assert is_blacklisted_name("AI") is True

    def test_case_insensitive_blacklist(self):
        assert is_blacklisted_name("aigc") is True

    def test_generic_role(self):
        assert is_blacklisted_name("创业者") is True

    def test_concept_pattern(self):
        assert is_blacklisted_name("AI创业生态") is True

    def test_valid_entity(self):
        assert is_blacklisted_name("OpenAI") is False

    def test_empty_string(self):
        assert is_blacklisted_name("") is True


class TestCountMentionsInText:
    def test_simple_count(self):
        text = "ChatGPT is great. I love ChatGPT."
        assert count_mentions_in_text(text, ["ChatGPT"]) == 2

    def test_case_insensitive_chinese(self):
        text = "月之暗面是一家公司。月之暗面很厉害。"
        assert count_mentions_in_text(text, ["月之暗面"]) == 2

    def test_no_overlapping(self):
        text = "OpenAI is not OpenAI's competitor"
        count = count_mentions_in_text(text, ["OpenAI"])
        assert count == 2

    def test_multiple_variants(self):
        text = "阿里巴巴和阿里都是同一家公司"
        count = count_mentions_in_text(text, ["阿里巴巴", "阿里"])
        # "阿里巴巴" matches first, then "阿里" at the end
        assert count >= 2

    def test_empty_text(self):
        assert count_mentions_in_text("", ["test"]) == 0

    def test_empty_variants(self):
        assert count_mentions_in_text("some text", []) == 0

    def test_word_boundary_latin(self):
        text = "MetaAI is different from Meta"
        count = count_mentions_in_text(text, ["Meta"])
        assert count == 1  # Only standalone "Meta", not "MetaAI"
