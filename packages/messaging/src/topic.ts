// Topic routing: pattern matching and topic hierarchy utilities for the message bus.

export interface TopicMatcher {
  matches(pattern: string, topic: string): boolean;
}

/** Exact-match topic matcher — subscribes to one specific topic string. */
export class ExactTopicMatcher implements TopicMatcher {
  matches(pattern: string, topic: string): boolean {
    return pattern === topic;
  }
}

/**
 * Glob-style topic matcher supporting:
 *   '*'  — matches one segment (no dots)
 *   '**' — matches zero or more segments
 */
export class GlobTopicMatcher implements TopicMatcher {
  matches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split(".");
    const topicParts = topic.split(".");
    return this.matchParts(patternParts, 0, topicParts, 0);
  }

  private matchParts(
    pattern: readonly string[],
    pi: number,
    topic: readonly string[],
    ti: number,
  ): boolean {
    if (pi === pattern.length && ti === topic.length) return true;
    if (pi === pattern.length) return false;

    const seg = pattern[pi];

    if (seg === "**") {
      // ** can match zero or more topic segments
      for (let skip = ti; skip <= topic.length; skip++) {
        if (this.matchParts(pattern, pi + 1, topic, skip)) return true;
      }
      return false;
    }

    if (ti === topic.length) return false;

    if (seg === "*" || seg === topic[ti]) {
      return this.matchParts(pattern, pi + 1, topic, ti + 1);
    }

    return false;
  }
}

/** Default glob matcher instance. */
export const defaultMatcher: TopicMatcher = new GlobTopicMatcher();

/** Build a namespaced topic string: `<namespace>.<event>`. */
export function buildTopic(namespace: string, event: string): string {
  return `${namespace}.${event}`;
}

/** Extract namespace prefix (all but last segment) from a topic. */
export function topicNamespace(topic: string): string {
  const idx = topic.lastIndexOf(".");
  return idx === -1 ? "" : topic.slice(0, idx);
}

/** Extract the event name (last segment) from a topic. */
export function topicEvent(topic: string): string {
  const idx = topic.lastIndexOf(".");
  return idx === -1 ? topic : topic.slice(idx + 1);
}

/** Filter a list of subscribed patterns to those matching a given topic. */
export function matchingPatterns(
  patterns: readonly string[],
  topic: string,
  matcher: TopicMatcher = defaultMatcher,
): readonly string[] {
  return patterns.filter((p) => matcher.matches(p, topic));
}
