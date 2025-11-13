import { useEffect } from "react";

function ensureMetaByName(name) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  return tag;
}

function ensureMetaByProperty(property) {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  return tag;
}

function ensureLinkRel(rel) {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  return link;
}

export function usePageSEO({ title, description, url, image }) {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    if (description) {
      const descTag = ensureMetaByName("description");
      descTag.setAttribute("content", description);
    }

    if (url) {
      const canonical = ensureLinkRel("canonical");
      canonical.setAttribute("href", url);
    }

    // Basic OpenGraph
    if (title) {
      const ogTitle = ensureMetaByProperty("og:title");
      ogTitle.setAttribute("content", title);
    }

    if (description) {
      const ogDesc = ensureMetaByProperty("og:description");
      ogDesc.setAttribute("content", description);
    }

    if (url) {
      const ogUrl = ensureMetaByProperty("og:url");
      ogUrl.setAttribute("content", url);
    }

    if (image) {
      const ogImg = ensureMetaByProperty("og:image");
      ogImg.setAttribute("content", image);
    }
  }, [title, description, url, image]);
}
