/**
 * ê³µìœ  ê´€ë ¨ ìœ í‹¸ë¦¬í‹° í•¨ìˆ˜ë“¤
 */

export interface SocialShareOptions {
  url: string;
  title?: string;
  text?: string;
  hashtags?: string[];
  via?: string; // Twitter username
}

/**
 * ì†Œì…œ ë¯¸ë””ì–´ ê³µìœ  URL ìƒì„±
 */
export const socialShareUrls = {
  /**
   * Twitter ê³µìœ  URL
   */
  twitter: (options: SocialShareOptions): string => {
    const params = new URLSearchParams();
    params.append("url", options.url);
    if (options.text) params.append("text", options.text);
    if (options.via) params.append("via", options.via);
    if (options.hashtags?.length) {
      params.append("hashtags", options.hashtags.join(","));
    }
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  },

  /**
   * Facebook ê³µìœ  URL
   */
  facebook: (options: SocialShareOptions): string => {
    const params = new URLSearchParams();
    params.append("u", options.url);
    if (options.text) params.append("quote", options.text);
    return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
  },

  /**
   * LinkedIn ê³µìœ  URL
   */
  linkedin: (options: SocialShareOptions): string => {
    const params = new URLSearchParams();
    params.append("url", options.url);
    return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
  },

  /**
   * WhatsApp ê³µìœ  URL
   */
  whatsapp: (options: SocialShareOptions): string => {
    const text = options.text
      ? `${options.text} ${options.url}`
      : options.url;
    const params = new URLSearchParams();
    params.append("text", text);
    return `https://wa.me/?${params.toString()}`;
  },

  /**
   * Telegram ê³µìœ  URL
   */
  telegram: (options: SocialShareOptions): string => {
    const params = new URLSearchParams();
    params.append("url", options.url);
    if (options.text) params.append("text", options.text);
    return `https://t.me/share/url?${params.toString()}`;
  },

  /**
   * Email ê³µìœ  URL
   */
  email: (options: SocialShareOptions): string => {
    const subject = options.title || "ê³µìœ ";
    const body = options.text
      ? `${options.text}\n\n${options.url}`
      : options.url;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },

  /**
   * Kakao Talk ê³µìœ  (ì›¹ ë§í¬)
   */
  kakao: (_options: SocialShareOptions): string => {
    // Kakao SDK í•„ìš”, ì—¬ê¸°ì„œëŠ” ì›¹ ë§í¬ë§Œ ìƒì„±
    return `https://sharer.kakao.com/talk/friends/picker/link?app_key=YOUR_APP_KEY&ka=sdk/YOUR_VERSION&validation_action=share&validation_params=${encodeURIComponent(JSON.stringify({ link_ver: "4.0", template_object: {} }))}`;
  },

  /**
   * LINE ê³µìœ  URL
   */
  line: (options: SocialShareOptions): string => {
    const text = options.text
      ? `${options.text} ${options.url}`
      : options.url;
    const params = new URLSearchParams();
    params.append("text", text);
    return `https://line.me/R/msg/text/?${params.toString()}`;
  },
};

/**
 * ê²Œì‹œê¸€ ê³µìœ  ë°ì´í„° ìƒì„±
 */
export function createPostShareData(post: {
  id: number;
  title: string;
  content: string;
  author: string;
  category?: string;
  tags?: string[];
}): SocialShareOptions {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/posts/${post.id}`;

  const text = `"${post.title}" by ${post.author}${post.category ? ` - ${post.category}` : ""}`;

  const hashtags = post.tags || [];

  return {
    url,
    title: post.title,
    text,
    hashtags,
  };
}

/**
 * ëŒ“ê¸€ ê³µìœ  ë°ì´í„° ìƒì„±
 */
export function createReplyShareData(
  post: { id: number; title: string },
  reply: { id: number; content: string; author: string }
): SocialShareOptions {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/posts/${post.id}#reply-${reply.id}`;

  const text = `${reply.author}ë‹˜ì˜ ë‹µê¸€: "${reply.content.substring(0, 100)}${reply.content.length > 100 ? "..." : ""}"`;

  return {
    url,
    title: post.title,
    text,
  };
}

/**
 * í”„ë¡œí•„ ê³µìœ  ë°ì´í„° ìƒì„±
 */
export function createProfileShareData(user: {
  nickname: string;
  badge?: string;
  stats?: { posts: number; replies: number };
}): SocialShareOptions {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/users/${user.nickname}`;

  let text = `${user.nickname}ë‹˜ì˜ í”„ë¡œí•„`;
  if (user.badge) {
    text += ` (${user.badge})`;
  }
  if (user.stats) {
    text += ` - ê²Œì‹œê¸€ ${user.stats.posts}ê°œ, ë‹µê¸€ ${user.stats.replies}ê°œ`;
  }

  return {
    url,
    title: `${user.nickname}ë‹˜ì˜ í”„ë¡œí•„`,
    text,
  };
}

/**
 * ì¹´í…Œê³ ë¦¬ ê³µìœ  ë°ì´í„° ìƒì„±
 */
export function createCategoryShareData(category: {
  id: string;
  name: string;
  subCategory?: string;
}): SocialShareOptions {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/category/${category.id}${category.subCategory ? `/${category.subCategory}` : ""}`;

  const text = category.subCategory
    ? `${category.name} > ${category.subCategory} ì¹´í…Œê³ ë¦¬`
    : `${category.name} ì¹´í…Œê³ ë¦¬`;

  return {
    url,
    title: text,
    text,
  };
}

/**
 * ê²€ìƒ‰ ê²°ê³¼ ê³µìœ  ë°ì´í„° ìƒì„±
 */
export function createSearchShareData(query: string, resultsCount: number): SocialShareOptions {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}`;

  const text = `"${query}" ê²€ìƒ‰ ê²°ê³¼ ${resultsCount}ê°œ`;

  return {
    url,
    title: text,
    text,
  };
}

/**
 * ê³µìœ  ë°©ë²•ì´ ì§€ì›ë˜ëŠ”ì§€ í™•ì¸
 */
export function checkShareSupport() {
  return {
    webShare: typeof navigator !== "undefined" && !!navigator.share,
    clipboard: typeof navigator !== "undefined" && !!navigator.clipboard,
    fileShare:
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [] }),
  };
}

/**
 * ìƒˆ ì°½ì—ì„œ URL ì—´ê¸° (ì†Œì…œ ê³µìœ ìš©)
 */
export function openShareWindow(
  url: string,
  title: string = "Share",
  width: number = 600,
  height: number = 400
): Window | null {
  if (typeof window === "undefined") return null;

  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  return window.open(
    url,
    title,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

/**
 * QR ì½”ë“œ ìƒì„± URL (ê³µìœ ìš©)
 */
export function generateQRCodeUrl(
  text: string,
  size: number = 200
): string {
  // QR Code API ì‚¬ìš© (ì˜ˆ: api.qrserver.com)
  const params = new URLSearchParams();
  params.append("size", `${size}x${size}`);
  params.append("data", text);
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

/**
 * ì§§ì€ URL ìƒì„± (ì‹¤ì œë¡œëŠ” API í•„ìš”)
 */
export async function shortenUrl(url: string): Promise<string> {
  // ì‹¤ì œë¡œëŠ” URL ë‹¨ì¶• API í˜¸ì¶œ (ì˜ˆ: bit.ly, tinyurl)
  // ì—¬ê¸°ì„œëŠ” ì˜ˆì‹œë¡œ ì›ë³¸ URL ë°˜í™˜
  // URL shortening not implemented (로그 제거)
  return url;
}

/**
 * ê³µìœ  í†µê³„ ì¶”ì 
 */
export function trackShare(
  platform: string,
  contentType: string,
  contentId: string | number
) {
  // Analytics ì´ë²¤íŠ¸ ì „ì†¡ (ì˜ˆ: GA, Mixpanel)
  // Share tracked (로그 제거)

  // ì‹¤ì œ êµ¬í˜„ ì˜ˆì‹œ:
  // if (window.gtag) {
  //   window.gtag('event', 'share', {
  //     method: platform,
  //     content_type: contentType,
  //     content_id: contentId,
  //   });
  // }
}
