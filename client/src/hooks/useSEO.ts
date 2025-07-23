import { useEffect } from 'react';

interface SEOData {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  keywords?: string;
}

export function useSEO(seoData: SEOData) {
  useEffect(() => {
    // Update page title
    document.title = seoData.title;
    
    // Update meta description
    updateMetaTag('name', 'description', seoData.description);
    
    // Update keywords if provided
    if (seoData.keywords) {
      updateMetaTag('name', 'keywords', seoData.keywords);
    }
    
    // Update canonical URL (always point to non-www version)
    const canonical = seoData.canonical || window.location.pathname;
    const canonicalUrl = `https://pbtenisokortas.lt${canonical}`;
    updateLinkTag('rel', 'canonical', 'href', canonicalUrl);
    
    // Update Open Graph tags
    updateMetaTag('property', 'og:title', seoData.ogTitle || seoData.title);
    updateMetaTag('property', 'og:description', seoData.ogDescription || seoData.description);
    updateMetaTag('property', 'og:url', canonicalUrl);
    
    if (seoData.ogImage) {
      updateMetaTag('property', 'og:image', seoData.ogImage);
    }
    
    // Update Twitter Card tags
    updateMetaTag('name', 'twitter:title', seoData.ogTitle || seoData.title);
    updateMetaTag('name', 'twitter:description', seoData.ogDescription || seoData.description);
    
    if (seoData.ogImage) {
      updateMetaTag('name', 'twitter:image', seoData.ogImage);
    }
  }, [seoData]);
}

function updateMetaTag(attribute: string, attributeValue: string, content: string) {
  let element = document.querySelector(`meta[${attribute}="${attributeValue}"]`) as HTMLMetaElement;
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, attributeValue);
    document.head.appendChild(element);
  }
  
  element.content = content;
}

function updateLinkTag(attribute: string, attributeValue: string, targetAttribute: string, value: string) {
  let element = document.querySelector(`link[${attribute}="${attributeValue}"]`) as HTMLLinkElement;
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute(attribute, attributeValue);
    document.head.appendChild(element);
  }
  
  element.setAttribute(targetAttribute, value);
}