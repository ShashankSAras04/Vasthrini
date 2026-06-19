import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  ogImage?: string
  ogType?: string
  canonical?: string
  schema?: object | object[]
}

export function useSEO({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonical,
  schema
}: SEOProps) {
  useEffect(() => {
    const brandName = 'VASTRINI'
    const fullTitle = title ? `${title} | ${brandName}` : `${brandName} - Premium Women's Fashion`
    document.title = fullTitle

    // Helper to update or create meta tags
    const setMetaTag = (attr: string, value: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${attr}"]` : `meta[name="${attr}"]`
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(isProperty ? 'property' : 'name', attr)
        document.head.appendChild(el)
      }
      el.setAttribute('content', value)
    }

    // Helper to update or create canonical link
    const setCanonicalLink = (url: string) => {
      let el = document.querySelector('link[rel="canonical"]')
      if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', 'canonical')
        document.head.appendChild(el)
      }
      el.setAttribute('href', url)
    }

    // Set standard meta description & OpenGraph / Twitter descriptions
    if (description) {
      setMetaTag('description', description)
      setMetaTag('og:description', description, true)
      setMetaTag('twitter:description', description, true)
    }

    if (keywords) {
      setMetaTag('keywords', keywords)
    }

    // Open Graph & Twitter Cards
    setMetaTag('og:title', fullTitle, true)
    setMetaTag('og:type', ogType, true)
    setMetaTag('og:site_name', brandName, true)
    setMetaTag('twitter:title', fullTitle, true)
    setMetaTag('twitter:card', ogImage ? 'summary_large_image' : 'summary', true)

    if (ogImage) {
      setMetaTag('og:image', ogImage, true)
      setMetaTag('twitter:image', ogImage, true)
    }

    const currentUrl = window.location.href
    setMetaTag('og:url', currentUrl, true)

    if (canonical) {
      setCanonicalLink(canonical)
    } else {
      setCanonicalLink(currentUrl)
    }

    // Inject/Update dynamic Structured Data (JSON-LD)
    let scriptEl = document.querySelector('#seo-jsonld') as HTMLScriptElement
    if (schema) {
      if (!scriptEl) {
        scriptEl = document.createElement('script')
        scriptEl.id = 'seo-jsonld'
        scriptEl.type = 'application/ld+json'
        document.head.appendChild(scriptEl)
      }
      scriptEl.text = JSON.stringify(schema)
    } else {
      if (scriptEl) {
        scriptEl.remove()
      }
    }
  }, [title, description, keywords, ogImage, ogType, canonical, schema])
}
