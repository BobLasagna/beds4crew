import supportTopicGroups from "./supportTopics.json";

const EXCLUDED_INTERNAL_PATHS = new Set(["/support/chat"]);
const getPathOnly = (href = "") => href.split("?")[0].split("#")[0];

export const SUPPORT_TOPIC_GROUPS = supportTopicGroups;

export const SUPPORT_TOPICS = SUPPORT_TOPIC_GROUPS.flatMap((group) => group.topics);

export const SUPPORT_INTERNAL_LINKS = SUPPORT_TOPICS
  .filter((topic) => {
    const href = topic.resourceLink?.href;
    if (!href?.startsWith("/")) {
      return false;
    }

    if (href.startsWith("/support#")) {
      return false;
    }

    return !EXCLUDED_INTERNAL_PATHS.has(getPathOnly(href));
  })
  .map((topic) => ({
    href: getPathOnly(topic.resourceLink.href),
    label: topic.resourceLink.label,
    title: topic.title,
    description: topic.description,
    slug: topic.slug,
    groupTitle: SUPPORT_TOPIC_GROUPS.find((group) => group.topics.some((groupTopic) => groupTopic.slug === topic.slug))?.title || "Support",
  }));

export const SUPPORT_INTERNAL_PATHS = [...new Set(SUPPORT_INTERNAL_LINKS.map((link) => link.href))];

export const SUPPORT_FOOTER_COLUMNS = SUPPORT_TOPIC_GROUPS.map((group) => ({
  title: group.title,
  links: group.topics.map((topic) => ({
    label: topic.title,
    slug: topic.slug,
  })),
}));
