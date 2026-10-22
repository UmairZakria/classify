// Language-level vocabulary: words that announce a field, and words that can
// never be part of a person's name / an address / a vehicle.

// Words that, when they appear, mean "a different field starts here".
// An address or a name never runs across one of these.
export const FIELD_WORDS = new Set(
  `phone ph cell cellphone mobile tel telephone number num dob born birthday birthdate bday email e-mail mail
  insurance insured ins insurer carrier carriers policy coverage covered premium vehicle vehicles vehical vehicals
  car cars auto autos truck trucks suv suvs drivers driver license licence owns own owned owner owners homeowner
  homeowners rent rents renter renting rental tenant lease leased years yrs yr year months month mos mo weeks days
  old age spouse wife husband married single divorced widowed kids children child son daughter call called calling
  callback cb wants want needs need quote quotes interested said says asked currently current previous previously
  thanks thank please tomorrow today yesterday morning afternoon evening tonight am pm accident accidents ticket
  tickets claim claims sr22 dui name zip zipcode notes note comments comment paid paying pays monthly bill
  married lives living live resides moved moving`.match(/[a-z0-9-]+/g)
);

// Common English function words / verbs: never names.
export const COMMON_WORDS = new Set(
  `a an the and or but nor so for of in on at to from by with without about above after again against all also
  am any are as be because been before being below between both can could did do does doing done down during each
  few further get got had has have having he her here hers him his how i if into is it its just me more most my no
  not now off once only other our out over own same she should some such than that their them then there these they
  this those through too under until up very was we were what when where which while who whom why will would you
  your yes yeah ok okay none na n/a unknown idk maybe sure good bad new used looking look shopping shop better
  cheaper cheap price rate rates lower high low wants send sent text texted email emailed spoke talk talked
  told tell left message voicemail busy hung hangup hang answer answered available info information details
  home house apartment condo mobile townhouse duplex property address street city state zip county country usa
  customer client lead prospect agent office work job employer employed retired disabled student military
  male female mr mrs ms miss dr sir madam`.match(/[a-z0-9/]+/g)
);

// Label phrases, longest first. Each label points at the field whose value
// follows it on the same line (or on the next line when it stands alone).
export const LABELS = [
  ["address", ["street address", "home address", "mailing address", "property address", "physical address", "garaging address", "address", "addres", "adress", "adres", "addr", "add", "addy", "lives at", "living at", "live at", "resides at", "residing at", "located at", "location", "residence", "street"]],
  ["name", ["full name", "customer name", "client name", "insured name", "contact name", "lead name", "first and last name", "policy holder", "policyholder", "name", "customer", "client", "insured", "contact"]],
  ["phone", ["phone number", "mobile number", "cell number", "contact number", "best number", "callback number", "phone", "mobile", "cell", "telephone", "tel", "ph", "number", "#"]],
  ["email", ["email address", "e-mail address", "email", "e-mail", "e mail", "mail"]],
  ["dob", ["date of birth", "birth date", "birthdate", "birthday", "d.o.b", "d o b", "dob", "born on", "born", "bday"]],
  ["spouse", ["spouse name", "spouses name", "spouse's name", "wife name", "husband name", "wife's name", "husband's name", "spouse dob", "wife dob", "husband dob", "spouse", "wife", "husband", "partner"]],
  ["carrier", ["current insurance company", "current insurance carrier", "insurance company", "insurance carrier", "insurance provider", "current insurance", "current carrier", "current provider", "current company", "prior carrier", "previous carrier", "insurer", "carrier", "insurance", "ins co", "ins", "provider", "currently with", "currently insured with", "insured with", "insured by", "insured through", "covered by", "covered with", "coverage with", "policy with"]],
  ["vehicles", ["vehicles", "vehicle", "vehical", "cars", "car", "autos", "auto", "year make model", "ymm", "trucks", "truck"]],
  ["zip", ["zip code", "zipcode", "postal code", "zip"]],
];
