/**
 * Runtime settings shared by the small page modules. Build-time settings (base URL,
 * noindex) live in site.config.json instead, because the HTML is stamped, not served.
 * Nothing here is secret: this file ships to every visitor.
 */
export const site = {
  phoneDisplay: '(813) 781-6255',
  phoneHref: 'tel:+18137816255',
  hours: 'Mon–Fri, 7:00 am – 5:00 pm Eastern',
};
