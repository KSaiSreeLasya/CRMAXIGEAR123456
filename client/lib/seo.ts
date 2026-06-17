import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const pageMetadata: Record<string, { title: string; description: string }> = {
  "/": { title: "AXIGEAR CRM Dashboard", description: "Manage EV bike sales, invoices, and retailer accounts" },
  "/dashboard": { title: "Dashboard - AXIGEAR CRM", description: "View your business dashboard and analytics" },
  "/projects": { title: "Projects - AXIGEAR CRM", description: "Manage your EV bike projects and estimations" },
  "/inventory": { title: "Inventory - AXIGEAR CRM", description: "Track and manage your inventory" },
  "/sales": { title: "Sales - AXIGEAR CRM", description: "View and manage sales records" },
  "/dealers": { title: "Dealers - AXIGEAR CRM", description: "Manage dealer and retailer accounts" },
  "/accounts": { title: "Accounts - AXIGEAR CRM", description: "View account details and information" },
  "/admin-employees": { title: "Employee Management - AXIGEAR CRM", description: "Manage employees and staff" },
  "/admin-settings": { title: "Settings - AXIGEAR CRM", description: "Configure system settings" },
  "/login": { title: "Sign In - AXIGEAR CRM", description: "Sign in to your AXIGEAR CRM account" },
};

export function useCanonicalUrl(baseUrl = "https://crm.axigearelectric.com") {
  const location = useLocation();

  useEffect(() => {
    const canonicalUrl = `${baseUrl}${location.pathname}`;
    const metadata = pageMetadata[location.pathname] || pageMetadata["/"];

    // Update canonical URL
    let canonicalLink = document.querySelector(
      "link[rel='canonical']"
    ) as HTMLLinkElement | null;

    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Update page title
    document.title = metadata.title;

    // Update meta description
    let metaDescription = document.querySelector(
      "meta[name='description']"
    ) as HTMLMetaElement | null;

    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = metadata.description;

    // Update og:url
    let ogUrl = document.querySelector(
      "meta[property='og:url']"
    ) as HTMLMetaElement | null;

    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = canonicalUrl;
  }, [location.pathname, baseUrl]);
}
