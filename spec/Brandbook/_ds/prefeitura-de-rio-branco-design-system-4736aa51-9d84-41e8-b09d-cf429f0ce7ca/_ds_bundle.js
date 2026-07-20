/* @ds-bundle: {"format":3,"namespace":"PrefeituraDeRioBrancoDesignSystem_4736aa","components":[{"name":"NewsCard","sourcePath":"components/cards/NewsCard.jsx"},{"name":"PublicationRow","sourcePath":"components/cards/PublicationRow.jsx"},{"name":"SecretariaCard","sourcePath":"components/cards/SecretariaCard.jsx"},{"name":"ServiceCard","sourcePath":"components/cards/ServiceCard.jsx"},{"name":"VideoCard","sourcePath":"components/cards/VideoCard.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"StatusPill","sourcePath":"components/core/StatusPill.jsx"},{"name":"AccessibilityBar","sourcePath":"components/navigation/AccessibilityBar.jsx"},{"name":"Footer","sourcePath":"components/navigation/Footer.jsx"},{"name":"Header","sourcePath":"components/navigation/Header.jsx"}],"sourceHashes":{"components/cards/NewsCard.jsx":"3e71914546b1","components/cards/PublicationRow.jsx":"6eafd3688530","components/cards/SecretariaCard.jsx":"904cd815ada0","components/cards/ServiceCard.jsx":"69806643a5fc","components/cards/VideoCard.jsx":"141fb0665ea7","components/core/Badge.jsx":"fe29714b0bc2","components/core/Button.jsx":"f70938dbc2b9","components/core/Icon.jsx":"c57f244294cd","components/core/IconButton.jsx":"56ddd46e6fda","components/core/StatusPill.jsx":"d515cd0787fc","components/navigation/AccessibilityBar.jsx":"5b6c39250560","components/navigation/Footer.jsx":"d253c7f2e0f4","components/navigation/Header.jsx":"c6a76294c3d7","ui_kits/portal/HomeScreen.jsx":"e8016faee9ee","ui_kits/portal/NewsScreen.jsx":"46abbe50f375","ui_kits/portal/SecretariasScreen.jsx":"63bba34f1ddd"},"inlinedExternals":[],"unexposedExports":[{"name":"a11yDataAttrs","sourcePath":"components/navigation/AccessibilityBar.jsx"}]} */

(() => {

const __ds_ns = (window.PrefeituraDeRioBrancoDesignSystem_4736aa = window.PrefeituraDeRioBrancoDesignSystem_4736aa || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/cards/SecretariaCard.jsx
try { (() => {
/**
 * SecretariaCard — directory card for a municipal secretariat / autarquia.
 * Sigla in a blue chip, full name, titular secretary, and physical address.
 */
function SecretariaCard({
  sigla,
  kind = "Secretaria Municipal",
  name,
  secretario,
  endereco,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      padding: "26px",
      boxShadow: "var(--shadow-sm)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "16px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 13,
      letterSpacing: "0.04em",
      color: "#fff",
      background: "var(--brand)",
      padding: "6px 12px",
      borderRadius: "var(--radius-md)"
    }
  }, sigla), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      fontWeight: 600
    }
  }, kind)), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 19,
      color: "var(--text-heading)",
      margin: "0 0 14px",
      lineHeight: 1.25
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }
  }, secretario ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      fontWeight: 600,
      flex: "0 0 78px"
    }
  }, "Secret\xE1rio"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-body)"
    }
  }, secretario)) : null, endereco ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "10px",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)",
      fontWeight: 600,
      flex: "0 0 78px"
    }
  }, "Endere\xE7o"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-body)"
    }
  }, endereco)) : null));
}
Object.assign(__ds_scope, { SecretariaCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/SecretariaCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small category label (pill). Quiet, blue-tinted by default.
 */
function Badge({
  children,
  tone = "neutral",
  style = {},
  ...rest
}) {
  const tones = {
    neutral: {
      color: "var(--azul-700)",
      background: "var(--azul-100)"
    },
    blue: {
      color: "#fff",
      background: "var(--azul-600)"
    },
    accent: {
      color: "var(--azul-900)",
      background: "var(--ambar-300)"
    }
  };
  const t = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontFamily: "var(--font-body)",
      fontSize: "12px",
      fontWeight: "var(--fw-bold)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "7px 14px",
      borderRadius: "var(--radius-pill)",
      lineHeight: 1,
      ...t,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — Prefeitura de Rio Branco
 * Institutional primary action carries the main task on each screen.
 * Amber accent only for high-visibility calls to action.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  iconLeft = null,
  iconRight = null,
  type = "button",
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      fontSize: "13px",
      padding: "9px 16px",
      radius: "var(--radius-sm)",
      gap: "6px"
    },
    md: {
      fontSize: "15px",
      padding: "12px 22px",
      radius: "var(--radius-md)",
      gap: "8px"
    },
    lg: {
      fontSize: "17px",
      padding: "15px 28px",
      radius: "var(--radius-lg)",
      gap: "10px"
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: "var(--brand)",
      color: "#fff",
      border: "1.5px solid transparent"
    },
    secondary: {
      background: "transparent",
      color: "var(--brand)",
      border: "1.5px solid var(--brand)"
    },
    tertiary: {
      background: "transparent",
      color: "var(--brand)",
      border: "1.5px solid transparent"
    },
    accent: {
      background: "var(--accent)",
      color: "var(--accent-text)",
      border: "1.5px solid transparent",
      fontWeight: "var(--fw-bold)"
    },
    danger: {
      background: "var(--erro)",
      color: "#fff",
      border: "1.5px solid transparent"
    }
  };
  const v = variants[variant] || variants.primary;
  const [hover, setHover] = React.useState(false);
  const hoverBg = {
    primary: "var(--brand-hover)",
    secondary: "var(--azul-50)",
    tertiary: "var(--azul-50)",
    accent: "var(--accent-hover)",
    danger: "var(--erro-700)"
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      fontFamily: "var(--font-body)",
      fontWeight: v.fontWeight || "var(--fw-semibold)",
      fontSize: s.fontSize,
      lineHeight: 1,
      padding: s.padding,
      borderRadius: s.radius,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background 0.15s ease, border-color 0.15s ease",
      ...v,
      ...(disabled ? {
        background: "var(--cinza-200)",
        color: "var(--cinza-400)",
        border: "1.5px solid transparent"
      } : hover ? {
        background: hoverBg
      } : {}),
      ...style
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Icon — renders a Lucide-style inline SVG by name from the brand icon set.
 * Inherits color via currentColor. Keep to the system's outline icons.
 */
const PATHS = {
  "arrow-right": '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  "chevron-down": '<polyline points="6 9 12 15 18 9"/>',
  "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  "search": '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  "menu": '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  "home": '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/>',
  "landmark": '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
  "receipt": '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  "play": '<polygon points="6 3 20 12 6 21 6 3"/>',
  "calendar": '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  "clock": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  "map-pin": '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>',
  "user": '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  "eye": '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  "contrast": '<circle cx="12" cy="12" r="10"/><path d="M12 18a6 6 0 0 0 0-12v12Z"/>',
  "type": '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
  "pause": '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  "link": '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  "rotate-ccw": '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  "newspaper": '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
  "phone": '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>',
  "mail": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  "facebook": '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  "instagram": '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
  "youtube": '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>',
  "shield-check": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
  "external-link": '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  "check": '<polyline points="20 6 9 17 4 12"/>',
  "info": '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
};
function Icon({
  name,
  size = 24,
  strokeWidth = 1.8,
  style = {},
  ...rest
}) {
  const body = PATHS[name] || "";
  return /*#__PURE__*/React.createElement("svg", _extends({
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      display: "inline-block",
      flexShrink: 0,
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: body
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/cards/NewsCard.jsx
try { (() => {
/**
 * NewsCard — news listing item. Reserves explicit slots for title,
 * excerpt, credits (author/photographer), publish date and time.
 */
function NewsCard({
  category,
  title,
  excerpt,
  credits,
  date,
  time,
  image,
  href = "#",
  style = {}
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "block",
      textDecoration: "none",
      background: "var(--surface-card)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
      transition: "box-shadow 0.18s ease",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    "data-role": "image",
    style: {
      height: 170,
      background: image ? `center/cover no-repeat url("${image}")` : "linear-gradient(150deg,var(--azul-600),var(--azul-900))",
      position: "relative"
    }
  }, category ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 14,
      left: 14,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#fff",
      background: "rgba(10,42,82,0.78)",
      backdropFilter: "blur(2px)",
      padding: "5px 11px",
      borderRadius: "var(--radius-sm)"
    }
  }, category) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 22px 22px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 18,
      lineHeight: 1.3,
      color: "var(--text-heading)",
      margin: "0 0 8px"
    }
  }, title), excerpt ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.6,
      color: "var(--text-body)",
      margin: "0 0 14px"
    }
  }, excerpt) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      flexWrap: "wrap",
      fontSize: 12.5,
      color: "var(--text-muted)"
    }
  }, credits ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--text-body)"
    }
  }, credits) : null, date ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "calendar",
    size: 13
  }), " ", date) : null, time ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 13
  }), " \xE0s ", time) : null)));
}
Object.assign(__ds_scope, { NewsCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/NewsCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/PublicationRow.jsx
try { (() => {
/**
 * PublicationRow — dense list row for an official publication
 * (Diário Oficial, decree, edital) with a type tag and download action.
 */
function PublicationRow({
  tag = "Decreto",
  title,
  meta,
  onDownload,
  href = "#",
  style = {}
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "6px",
      boxShadow: "var(--shadow-xs)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "20px",
      padding: "16px 18px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "#fff",
      background: "var(--azul-600)",
      padding: "5px 11px",
      borderRadius: "var(--radius-sm)",
      flex: "0 0 auto"
    }
  }, tag), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      fontSize: 16,
      color: "var(--text-title)",
      textDecoration: "none"
    }
  }, title), meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, meta) : null), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDownload,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "var(--font-body)",
      fontSize: 14,
      fontWeight: 600,
      padding: "10px 18px",
      borderRadius: "var(--radius-md)",
      border: "1.5px solid var(--brand)",
      background: hover ? "var(--azul-50)" : "#fff",
      color: "var(--brand)",
      cursor: "pointer",
      flex: "0 0 auto",
      transition: "background 0.15s ease"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "download",
    size: 16
  }), " Baixar PDF")));
}
Object.assign(__ds_scope, { PublicationRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/PublicationRow.jsx", error: String((e && e.message) || e) }); }

// components/cards/ServiceCard.jsx
try { (() => {
/**
 * ServiceCard — quick-access card for a citizen service
 * (Portal da Transparência, Diário Oficial, NFS-e, IPTU…).
 */
function ServiceCard({
  title,
  description,
  icon = "landmark",
  status,
  href = "#",
  cta = "Acessar serviço",
  onClick,
  style = {}
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "block",
      textDecoration: "none",
      background: "var(--surface-card)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      padding: "26px",
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
      transform: hover ? "translateY(-2px)" : "none",
      transition: "box-shadow 0.18s ease, transform 0.18s ease",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: 11,
      background: "var(--azul-50)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--brand)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 24,
    strokeWidth: 1.7
  })), status ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--sucesso)",
      background: "var(--sucesso-bg)",
      padding: "4px 10px",
      borderRadius: "var(--radius-pill)"
    }
  }, status) : null), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 20,
      color: "var(--text-heading)",
      margin: "0 0 6px"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.6,
      color: "var(--text-body)",
      margin: "0 0 18px"
    }
  }, description), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--text-link)"
    }
  }, cta, " \u2192"));
}
Object.assign(__ds_scope, { ServiceCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/ServiceCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/VideoCard.jsx
try { (() => {
/**
 * VideoCard — gallery item with a video thumbnail + play overlay.
 * Like NewsCard, requires title, credits, date and time.
 */
function VideoCard({
  title,
  credits,
  date,
  time,
  duration,
  image,
  href = "#",
  style = {}
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "block",
      textDecoration: "none",
      background: "var(--surface-card)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
      transition: "box-shadow 0.18s ease",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    "data-role": "image",
    style: {
      height: 180,
      background: image ? `center/cover no-repeat url("${image}")` : "linear-gradient(150deg,var(--azul-700),var(--azul-900))",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 56,
      height: 56,
      borderRadius: "var(--radius-pill)",
      background: "rgba(255,255,255,0.92)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--brand)",
      boxShadow: "0 4px 16px rgba(10,42,82,0.3)",
      transform: hover ? "scale(1.06)" : "none",
      transition: "transform 0.18s ease"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "play",
    size: 22
  })), duration ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      bottom: 12,
      right: 12,
      fontSize: 12,
      fontWeight: 600,
      color: "#fff",
      background: "rgba(10,42,82,0.82)",
      padding: "3px 9px",
      borderRadius: "var(--radius-sm)"
    }
  }, duration) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 22px 20px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      fontSize: 17,
      lineHeight: 1.3,
      color: "var(--text-heading)",
      margin: "0 0 12px"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      flexWrap: "wrap",
      fontSize: 12.5,
      color: "var(--text-muted)"
    }
  }, credits ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--text-body)"
    }
  }, credits) : null, date ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "calendar",
    size: 13
  }), " ", date) : null, time ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "clock",
    size: 13
  }), " \xE0s ", time) : null)));
}
Object.assign(__ds_scope, { VideoCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/VideoCard.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * IconButton — square icon-only button. Used in toolbars and compact actions.
 */
function IconButton({
  icon,
  name,
  variant = "ghost",
  size = "md",
  label,
  onClick,
  style = {},
  ...rest
}) {
  const dims = {
    sm: 32,
    md: 40,
    lg: 46
  }[size] || 40;
  const iconSize = {
    sm: 16,
    md: 20,
    lg: 22
  }[size] || 20;
  const [hover, setHover] = React.useState(false);
  const variants = {
    ghost: {
      background: hover ? "var(--azul-50)" : "transparent",
      color: "var(--brand)",
      border: "1px solid transparent"
    },
    outline: {
      background: hover ? "var(--azul-50)" : "#fff",
      color: "var(--brand)",
      border: "1px solid var(--border)"
    },
    solid: {
      background: hover ? "var(--brand-hover)" : "var(--brand)",
      color: "#fff",
      border: "1px solid transparent"
    }
  };
  const v = variants[variant] || variants.ghost;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: dims,
      height: dims,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      transition: "background 0.15s ease",
      ...v,
      ...style
    }
  }, rest), icon || (name ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: name,
    size: iconSize
  }) : null));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * StatusPill — communicates the state of a document or service.
 * Color is never the only signal — always paired with text.
 * `filled` (solid) or `outline` style; map status to semantic tone.
 */
function StatusPill({
  children,
  status = "info",
  outline = false,
  style = {},
  ...rest
}) {
  const map = {
    success: {
      solid: "var(--sucesso)",
      text: "var(--sucesso)",
      bg: "var(--sucesso-bg)"
    },
    warning: {
      solid: "var(--atencao)",
      text: "#8A5410",
      bg: "var(--atencao-bg)"
    },
    error: {
      solid: "var(--erro)",
      text: "var(--erro-700)",
      bg: "var(--erro-bg)"
    },
    info: {
      solid: "var(--azul-600)",
      text: "var(--azul-700)",
      bg: "var(--info-bg)"
    }
  };
  const c = map[status] || map.info;
  const styleSet = outline ? {
    color: c.text,
    background: c.bg,
    border: `1px solid ${c.solid}`
  } : {
    color: "#fff",
    background: c.solid,
    border: "1px solid transparent"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: "var(--font-body)",
      fontSize: "13px",
      fontWeight: "var(--fw-semibold)",
      padding: outline ? "5px 13px" : "6px 14px",
      borderRadius: "var(--radius-pill)",
      lineHeight: 1,
      ...styleSet,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/navigation/AccessibilityBar.jsx
try { (() => {
/**
 * AccessibilityBar — the portal's signature real-time interface controls.
 * Renders the A−/A/A+ text resize plus toggles for high contrast,
 * grayscale, highlight links, focus ring, reading mask, pause animations,
 * and reset. Controlled via `value` + `onChange` (or runs uncontrolled).
 */
function AccessibilityBar({
  value,
  onChange,
  style = {}
}) {
  const [internal, setInternal] = React.useState({
    fs: "md",
    contrast: false,
    gray: false,
    hllinks: false,
    focusring: false,
    mask: false,
    noanim: false,
    readable: false
  });
  const state = value || internal;
  const set = next => {
    if (onChange) onChange(next);else setInternal(next);
  };
  const toggle = k => set({
    ...state,
    [k]: !state[k]
  });
  const order = ["sm", "md", "lg", "xl"];
  const stepFs = d => {
    let i = order.indexOf(state.fs);
    i = Math.min(order.length - 1, Math.max(0, i + d));
    set({
      ...state,
      fs: order[i]
    });
  };
  const sizeBtn = (label, fs, onClick) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      minWidth: 36,
      padding: "7px 10px",
      borderRadius: "var(--radius-md)",
      border: "1px solid rgba(255,255,255,0.20)",
      background: "rgba(255,255,255,0.06)",
      color: "#fff",
      fontFamily: "var(--font-body)",
      fontWeight: 700,
      fontSize: fs,
      cursor: "pointer",
      lineHeight: 1
    }
  }, label);
  const toggleBtn = (label, key, icon) => {
    const on = state[key];
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => toggle(key),
      "aria-pressed": on,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 12px",
        borderRadius: "var(--radius-md)",
        border: "1px solid " + (on ? "#3A82D6" : "rgba(255,255,255,0.20)"),
        background: on ? "var(--azul-500)" : "rgba(255,255,255,0.06)",
        color: "#fff",
        fontFamily: "var(--font-body)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        lineHeight: 1
      }
    }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: icon,
      size: 14
    }) : null, label);
  };
  const sep = /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 22,
      background: "rgba(255,255,255,0.14)",
      margin: "0 4px"
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--azul-300)",
      marginRight: 6
    }
  }, "Acessibilidade"), sizeBtn("A−", 12, () => stepFs(-1)), sizeBtn("A", 14, () => set({
    ...state,
    fs: "md"
  })), sizeBtn("A+", 16, () => stepFs(1)), sep, toggleBtn("Alto contraste", "contrast", "contrast"), toggleBtn("Escala de cinza", "gray", "eye"), toggleBtn("Destacar links", "hllinks", "link"), toggleBtn("Contorno de foco", "focusring", "type"), toggleBtn("Fonte legível", "readable", "type"), toggleBtn("Pausar animações", "noanim", "pause"), sep, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => set({
      fs: "md",
      contrast: false,
      gray: false,
      hllinks: false,
      focusring: false,
      mask: false,
      noanim: false,
      readable: false
    }),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "7px 12px",
      borderRadius: "var(--radius-md)",
      border: "1px solid rgba(255,255,255,0.20)",
      background: "rgba(255,255,255,0.06)",
      color: "#fff",
      fontFamily: "var(--font-body)",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "rotate-ccw",
    size: 14
  }), "Redefinir"));
}

/** Maps an AccessibilityBar state object to the data-* attributes the CSS hooks read. */
function a11yDataAttrs(state = {}) {
  return {
    "data-fs": state.fs || "md",
    "data-contrast": state.contrast ? "on" : null,
    "data-gray": state.gray ? "on" : null,
    "data-hllinks": state.hllinks ? "on" : null,
    "data-focusring": state.focusring ? "on" : null,
    "data-noanim": state.noanim ? "on" : null,
    "data-readable": state.readable ? "on" : null,
    "data-hideimg": state.hideimg ? "on" : null
  };
}
Object.assign(__ds_scope, { AccessibilityBar, a11yDataAttrs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/AccessibilityBar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Footer.jsx
try { (() => {
/**
 * Footer — standardized institutional footer: address, quick links,
 * social, accessibility shortcut and copyright.
 */
function Footer({
  style = {}
}) {
  const col = (title, links) => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--azul-300)",
      marginBottom: 12
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    style: {
      color: "var(--azul-100)",
      fontSize: 14,
      textDecoration: "none"
    }
  }, l))));
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--azul-900)",
      color: "#fff",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-comfortable)",
      margin: "0 auto",
      padding: "48px 40px",
      display: "flex",
      justifyContent: "space-between",
      gap: 40,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "34ch"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: "linear-gradient(150deg,var(--azul-600),var(--azul-900))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid rgba(255,255,255,0.14)",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 15,
      color: "var(--accent)"
    }
  }, "RB"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 15,
      letterSpacing: "0.01em"
    }
  }, "PREFEITURA DE RIO BRANCO")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      fontSize: 14,
      color: "var(--azul-300)",
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "map-pin",
    size: 16,
    style: {
      marginTop: 3,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", null, "R. Rui Barbosa, 285 \u2014 Centro", /*#__PURE__*/React.createElement("br", null), "Rio Branco \u2014 AC \xB7 CEP 69900-120")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 18
    }
  }, ["facebook", "instagram", "youtube"].map(n => /*#__PURE__*/React.createElement("a", {
    key: n,
    href: "#",
    "aria-label": n,
    style: {
      width: 38,
      height: 38,
      borderRadius: "var(--radius-md)",
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.16)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: n,
    size: 18
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 48,
      flexWrap: "wrap"
    }
  }, col("Serviços", ["Portal da Transparência", "Ouvidoria", "Nota Fiscal Eletrônica", "IPTU Online"]), col("Institucional", ["Secretarias", "Mapa do Site", "Declaração de Acessibilidade", "Diário Oficial"]))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid rgba(255,255,255,0.10)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-comfortable)",
      margin: "0 auto",
      padding: "20px 40px",
      display: "flex",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
      fontSize: 13,
      color: "var(--azul-300)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2025 Prefeitura de Rio Branco. Todos os direitos reservados."), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      color: "var(--azul-100)",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "shield-check",
    size: 15
  }), " Acessibilidade"))));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Footer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Header.jsx
try { (() => {
/**
 * Header — global municipal portal header. Institutional-blue bar with the
 * RB lockup, the four pillar dropdowns (A Prefeitura, Publicações, Portais,
 * Sistemas Administrativos), a search field, and the accessibility bar.
 */
const DEFAULT_NAV = [{
  label: "A Prefeitura",
  items: ["O Prefeito", "Vice-Prefeito", "Secretarias", "História da Cidade", "Símbolos Municipais"]
}, {
  label: "Publicações",
  items: ["Diário Oficial", "Notícias", "Decretos e Leis", "Editais", "Galeria de Vídeos"]
}, {
  label: "Portais",
  items: ["Portal da Transparência", "Ouvidoria", "Nota Fiscal Eletrônica", "ISS Digital"]
}, {
  label: "Sistemas Administrativos",
  items: ["IPTU Online", "Protocolo", "Licitações", "Servidor Público"]
}];
function Header({
  nav = DEFAULT_NAV,
  a11y,
  onA11yChange,
  logoSrc,
  style = {}
}) {
  const [open, setOpen] = React.useState(null);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "var(--azul-900)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-comfortable)",
      margin: "0 auto",
      padding: "14px 40px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 24,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      textDecoration: "none"
    }
  }, logoSrc ? /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "Prefeitura de Rio Branco",
    "data-role": "image",
    style: {
      height: 44,
      width: 44,
      borderRadius: 11
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 11,
      background: "linear-gradient(150deg,var(--azul-600),var(--azul-900))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "1px solid rgba(255,255,255,0.14)",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 18,
      color: "var(--accent)",
      letterSpacing: "-0.02em"
    }
  }, "RB"), /*#__PURE__*/React.createElement("span", {
    style: {
      lineHeight: 1.15
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 16,
      color: "#fff",
      letterSpacing: "0.01em"
    }
  }, "PREFEITURA DE RIO BRANCO"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: 12,
      color: "var(--azul-300)",
      fontWeight: 500,
      letterSpacing: "0.04em"
    }
  }, "Estado do Acre"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: "var(--radius-pill)",
      padding: "9px 16px",
      minWidth: 240,
      color: "var(--azul-300)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 18
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar servi\xE7os, not\xEDcias\u2026",
    style: {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      color: "#fff",
      fontFamily: "var(--font-body)",
      fontSize: 14
    }
  }))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      flexWrap: "wrap",
      paddingTop: 8,
      borderTop: "1px solid rgba(255,255,255,0.10)"
    },
    onMouseLeave: () => setOpen(null)
  }, nav.map((group, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      position: "relative"
    },
    onMouseEnter: () => setOpen(i)
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "9px 14px",
      borderRadius: "var(--radius-md)",
      border: "none",
      background: open === i ? "rgba(255,255,255,0.10)" : "transparent",
      color: "#fff",
      fontFamily: "var(--font-body)",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer"
    }
  }, group.label, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 15,
    style: {
      transform: open === i ? "rotate(180deg)" : "none",
      transition: "transform 0.15s ease"
    }
  })), open === i ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      minWidth: 240,
      background: "#fff",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      border: "1px solid var(--border)",
      padding: 8,
      zIndex: 60
    }
  }, group.items.map((item, j) => /*#__PURE__*/React.createElement("a", {
    key: j,
    href: "#",
    style: {
      display: "block",
      padding: "10px 14px",
      borderRadius: "var(--radius-sm)",
      color: "var(--text-body)",
      fontSize: 14,
      fontWeight: 500,
      textDecoration: "none"
    },
    onMouseEnter: e => e.currentTarget.style.background = "var(--azul-50)",
    onMouseLeave: e => e.currentTarget.style.background = "transparent"
  }, item))) : null))), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 10,
      borderTop: "1px solid rgba(255,255,255,0.10)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.AccessibilityBar, {
    value: a11y,
    onChange: onA11yChange
  }))));
}
Object.assign(__ds_scope, { Header });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Header.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Portal UI kit — Home screen. Hero + quick-access services + latest news. */
const {
  ServiceCard,
  NewsCard,
  Button,
  Icon,
  StatusPill
} = window.PrefeituraDeRioBrancoDesignSystem_4736aa;
function HomeScreen({
  onNavigate
}) {
  const services = [{
    title: "Portal da Transparência",
    description: "Receitas, despesas, contratos e a execução orçamentária do município.",
    icon: "landmark"
  }, {
    title: "IPTU 2026",
    description: "Emita a 2ª via, consulte parcelas e acompanhe o pagamento do imóvel.",
    icon: "home",
    status: "Disponível"
  }, {
    title: "Diário Oficial",
    description: "Decretos, leis, portarias e editais publicados pela Prefeitura.",
    icon: "file-text"
  }, {
    title: "Nota Fiscal Eletrônica",
    description: "Emita e consulte a NFS-e dos prestadores de serviço do município.",
    icon: "receipt"
  }];
  const news = [{
    category: "Saúde",
    title: "Mutirão amplia atendimento na zona rural do município",
    excerpt: "Ação leva consultas, exames e vacinas a comunidades ribeirinhas ao longo da semana.",
    credits: "Luana Lima/Secom",
    date: "12 de junho de 2026",
    time: "12:04"
  }, {
    category: "Infraestrutura",
    title: "Pavimentação avança em sete bairros da capital",
    excerpt: "Programa de recuperação viária contempla mais de 40 ruas neste semestre.",
    credits: "Carlos Souza/Secom",
    date: "11 de junho de 2026",
    time: "09:18"
  }, {
    category: "Educação",
    title: "Matrículas da rede municipal abrem na próxima segunda",
    excerpt: "Inscrições poderão ser feitas presencialmente ou pelo portal de serviços.",
    credits: "Secom/PMRB",
    date: "10 de junho de 2026",
    time: "16:40"
  }];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("section", {
    style: {
      background: "linear-gradient(160deg,#0A2A52 0%,#14467F 70%,#1E5AA0 100%)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-comfortable)",
      margin: "0 auto",
      padding: "72px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "var(--accent)",
      marginBottom: 18
    }
  }, "Prefeitura de Rio Branco \xB7 Acre"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 52,
      lineHeight: 1.05,
      letterSpacing: "-0.022em",
      margin: "0 0 18px",
      maxWidth: "16ch"
    }
  }, "Servi\xE7os ao cidad\xE3o, em um s\xF3 lugar"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      lineHeight: 1.6,
      color: "var(--azul-100)",
      maxWidth: "56ch",
      margin: "0 0 28px"
    }
  }, "Acesse servi\xE7os, acompanhe a gest\xE3o e fique por dentro das not\xEDcias da sua cidade."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "accent",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 16
    })
  }, "Acessar servi\xE7os"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    style: {
      color: "#fff",
      borderColor: "rgba(255,255,255,0.4)"
    },
    onClick: () => onNavigate("noticias")
  }, "Ver not\xEDcias")))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: "var(--container-comfortable)",
      margin: "0 auto",
      padding: "56px 40px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: 24,
      flexWrap: "wrap",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 30,
      color: "var(--azul-900)",
      margin: 0,
      letterSpacing: "-0.01em"
    }
  }, "Acesso r\xE1pido"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--text-link)",
      textDecoration: "none"
    }
  }, "Todos os servi\xE7os \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 20
    }
  }, services.map((s, i) => /*#__PURE__*/React.createElement(ServiceCard, _extends({
    key: i
  }, s))))), /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: "var(--container-comfortable)",
      margin: "0 auto",
      padding: "40px 40px 80px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: 24,
      flexWrap: "wrap",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 30,
      color: "var(--azul-900)",
      margin: 0,
      letterSpacing: "-0.01em"
    }
  }, "\xDAltimas not\xEDcias"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate("noticias");
    },
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--text-link)",
      textDecoration: "none"
    }
  }, "Ver todas \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 20
    }
  }, news.map((n, i) => /*#__PURE__*/React.createElement(NewsCard, _extends({
    key: i
  }, n))))));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/NewsScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Portal UI kit — News listing screen with category filter + video gallery. */
const {
  NewsCard,
  VideoCard,
  Badge
} = window.PrefeituraDeRioBrancoDesignSystem_4736aa;
function NewsScreen() {
  const cats = ["Todas", "Saúde", "Educação", "Infraestrutura", "Meio Ambiente"];
  const [active, setActive] = React.useState("Todas");
  const news = [{
    category: "Saúde",
    title: "Mutirão amplia atendimento na zona rural do município",
    excerpt: "Ação leva consultas, exames e vacinas a comunidades ribeirinhas ao longo da semana.",
    credits: "Luana Lima/Secom",
    date: "12 de junho de 2026",
    time: "12:04"
  }, {
    category: "Infraestrutura",
    title: "Pavimentação avança em sete bairros da capital",
    excerpt: "Programa de recuperação viária contempla mais de 40 ruas neste semestre.",
    credits: "Carlos Souza/Secom",
    date: "11 de junho de 2026",
    time: "09:18"
  }, {
    category: "Educação",
    title: "Matrículas da rede municipal abrem na próxima segunda",
    excerpt: "Inscrições poderão ser feitas presencialmente ou pelo portal de serviços.",
    credits: "Secom/PMRB",
    date: "10 de junho de 2026",
    time: "16:40"
  }, {
    category: "Meio Ambiente",
    title: "Programa de coleta seletiva chega a novos bairros",
    excerpt: "Iniciativa amplia a reciclagem e gera renda para cooperativas locais.",
    credits: "Ana Paula/Secom",
    date: "09 de junho de 2026",
    time: "11:25"
  }, {
    category: "Saúde",
    title: "Unidades de saúde ampliam horário de vacinação",
    excerpt: "Atendimento estendido busca facilitar o acesso da população ativa.",
    credits: "Secom/PMRB",
    date: "08 de junho de 2026",
    time: "14:10"
  }, {
    category: "Educação",
    title: "Escolas municipais recebem novos laboratórios de informática",
    excerpt: "Investimento moderniza o ensino e a inclusão digital de estudantes.",
    credits: "Marcos Lima/Secom",
    date: "07 de junho de 2026",
    time: "10:02"
  }];
  const filtered = active === "Todas" ? news : news.filter(n => n.category === active);
  const videos = [{
    title: "Balanço de obras de pavimentação — junho",
    credits: "Secom/PMRB",
    date: "10 de junho de 2026",
    time: "09:30",
    duration: "3:24"
  }, {
    title: "Coletiva: novo programa de saúde da família",
    credits: "Secom/PMRB",
    date: "06 de junho de 2026",
    time: "15:00",
    duration: "12:08"
  }, {
    title: "Inauguração da praça do bairro Floresta",
    credits: "Secom/PMRB",
    date: "03 de junho de 2026",
    time: "18:45",
    duration: "5:51"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-comfortable)",
      margin: "0 auto",
      padding: "48px 40px 80px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--ambar-500)",
      marginBottom: 10
    }
  }, "Publica\xE7\xF5es"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 40,
      color: "var(--azul-900)",
      margin: "0 0 24px",
      letterSpacing: "-0.015em"
    }
  }, "Not\xEDcias"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      marginBottom: 28
    }
  }, cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    type: "button",
    onClick: () => setActive(c),
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 13,
      fontWeight: 600,
      padding: "8px 16px",
      borderRadius: "var(--radius-pill)",
      cursor: "pointer",
      border: "1px solid " + (active === c ? "var(--brand)" : "var(--border)"),
      background: active === c ? "var(--brand)" : "#fff",
      color: active === c ? "#fff" : "var(--text-body)"
    }
  }, c))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 20,
      marginBottom: 56
    }
  }, filtered.map((n, i) => /*#__PURE__*/React.createElement(NewsCard, _extends({
    key: i
  }, n)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 28,
      color: "var(--azul-900)",
      margin: 0,
      letterSpacing: "-0.01em"
    }
  }, "Galeria de v\xEDdeos"), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "Secom")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 20
    }
  }, videos.map((v, i) => /*#__PURE__*/React.createElement(VideoCard, _extends({
    key: i
  }, v)))));
}
window.NewsScreen = NewsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/NewsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portal/SecretariasScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Portal UI kit — Secretariat directory screen with search + publications. */
const {
  SecretariaCard,
  PublicationRow,
  Icon
} = window.PrefeituraDeRioBrancoDesignSystem_4736aa;
function SecretariasScreen() {
  const [q, setQ] = React.useState("");
  const secs = [{
    sigla: "SEME",
    name: "Secretaria Municipal de Educação",
    secretario: "Alysson Bestene Lins",
    endereco: "Av. Antônio da Rocha Viana, 1369 — Vila Ivonete"
  }, {
    sigla: "SEFIN",
    name: "Secretaria Municipal de Finanças",
    secretario: "Roberta Albuquerque",
    endereco: "R. Rui Barbosa, 285 — Centro"
  }, {
    sigla: "SDTI",
    name: "Secretaria de Desenvolvimento, Tecnologia e Inovação",
    secretario: "Eduardo Farias",
    endereco: "Trav. Champagnat, 50 — Bosque"
  }, {
    sigla: "SEMSUR",
    name: "Secretaria Municipal de Serviços Urbanos",
    secretario: "João Marcos Luz",
    endereco: "Estrada do Aviário, 927 — Aviário"
  }, {
    sigla: "SMS",
    name: "Secretaria Municipal de Saúde",
    secretario: "Sheila Andrade",
    endereco: "R. Alvorada, 178 — Bosque"
  }, {
    sigla: "SEMEIA",
    name: "Secretaria Municipal de Meio Ambiente",
    secretario: "Frank Lima",
    endereco: "Av. Nações Unidas, 2200 — Estação Experimental"
  }];
  const filtered = secs.filter(s => (s.sigla + " " + s.name).toLowerCase().includes(q.toLowerCase()));
  const pubs = [{
    tag: "Decreto",
    title: "Decreto nº 1.234/2026 — Calendário de feriados municipais",
    meta: "Publicado em 12 de junho de 2026 · Diário Oficial"
  }, {
    tag: "Edital",
    title: "Edital nº 08/2026 — Processo seletivo simplificado da Educação",
    meta: "Publicado em 10 de junho de 2026 · Diário Oficial"
  }, {
    tag: "Portaria",
    title: "Portaria nº 145/2026 — Nomeação de servidores efetivos",
    meta: "Publicado em 09 de junho de 2026 · Diário Oficial"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-comfortable)",
      margin: "0 auto",
      padding: "48px 40px 80px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--ambar-500)",
      marginBottom: 10
    }
  }, "A Prefeitura"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 40,
      color: "var(--azul-900)",
      margin: "0 0 8px",
      letterSpacing: "-0.015em"
    }
  }, "Secretarias & Autarquias"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      lineHeight: 1.6,
      color: "var(--text-body)",
      maxWidth: "60ch",
      margin: "0 0 28px"
    }
  }, "Encontre o contato e o endere\xE7o de cada pasta da administra\xE7\xE3o municipal."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "#fff",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-pill)",
      padding: "12px 20px",
      maxWidth: 460,
      marginBottom: 32,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Buscar secretaria (ex: SEME, Educa\xE7\xE3o)\u2026",
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--text-body)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 20,
      marginBottom: 56
    }
  }, filtered.map((s, i) => /*#__PURE__*/React.createElement(SecretariaCard, _extends({
    key: i
  }, s)))), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: 28,
      color: "var(--azul-900)",
      margin: "0 0 20px",
      letterSpacing: "-0.01em"
    }
  }, "Publica\xE7\xF5es recentes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, pubs.map((p, i) => /*#__PURE__*/React.createElement(PublicationRow, _extends({
    key: i
  }, p)))));
}
window.SecretariasScreen = SecretariasScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portal/SecretariasScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.NewsCard = __ds_scope.NewsCard;

__ds_ns.PublicationRow = __ds_scope.PublicationRow;

__ds_ns.SecretariaCard = __ds_scope.SecretariaCard;

__ds_ns.ServiceCard = __ds_scope.ServiceCard;

__ds_ns.VideoCard = __ds_scope.VideoCard;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.AccessibilityBar = __ds_scope.AccessibilityBar;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.Header = __ds_scope.Header;

})();
