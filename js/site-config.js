/**
 * Runtime settings shared by the small page modules. Build-time settings (base URL,
 * noindex) live in site.config.json instead, because the HTML is stamped, not served.
 * Nothing here is secret: this file ships to every visitor.
 */
export const site = {
  phoneDisplay: '(813) 781-6255',
  phoneHref: 'tel:+18137816255',
  hours: 'Mon–Fri, 7:00 am – 5:00 pm Eastern',

  // Contact form (Web3Forms). The access key is designed to be public; the recipient
  // email is configured in the Web3Forms dashboard and never appears in this repo.
  form: {
    endpoint: 'https://api.web3forms.com/submit',
    accessKey: '', // [[PLACEHOLDER: Web3Forms access key]]
  },
};
