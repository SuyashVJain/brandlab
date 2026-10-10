/**
 * All editable site text in one place. Components read from here; nothing
 * below is hard-coded in a section. Keep it in sync with docs/CONTENT.md.
 *
 * This is plain data on purpose (strings, numbers, arrays), so a later admin
 * page can load and save the same shape without touching the components.
 */

export type TimelineStep = {
  title: string;
  /** Optional extra line shown with the step (time, room). */
  note?: string;
};

export type Fact = {
  label: string;
  value: string;
  /** Short supporting lines shown under the value. */
  notes?: string[];
};

export type FaqItem = { question: string; answer: string };

export type CreditPiece = { text: string; href?: string };

export const siteContent = {
  howItWorks: {
    sideText: ["Same words,", "different worlds."],
    steps: [
      {
        number: "01",
        title: "Receive Keywords",
        text: "Everyone gets the same set of keywords at the same moment.",
        icon: "bulb",
      },
      {
        number: "02",
        title: "Create a Unique Event Name",
        text: "Turn the keywords into an event name nobody else will think of.",
        icon: "pencil",
      },
      {
        number: "03",
        title: "Design a Poster",
        text: "Build the identity for that event as a poster.",
        icon: "image",
      },
    ],
  },

  eligibility: "Open to SUAS students only.",
  fee: "Free to participate.",
  bring: "Bring your own laptop or device. Use any tools you like.",

  date: "Tuesday, 13 October 2026",
  venue: "Engineering Block, SUAS",
  participation: "Individual, 1-2 people",

  /** Steps in order. Only the first one carries a time and room. */
  timeline: [
    { title: "Reporting and check-in", note: "10:00 AM, Seminar Hall 2" },
    { title: "Briefing" },
    { title: "Keywords revealed" },
    { title: "Naming + design round" },
    { title: "Submission closes" },
    { title: "Judging" },
    { title: "Results and certificates" },
  ] as TimelineStep[],

  rules: [
    "Entries are individual or a pair (maximum 2 people).",
    "Everyone gets the same keywords. The event name and poster must be built from them.",
    "Work must be original. No copied posters, logos or templates passed off as your own.",
    "Submit before the deadline through the website. Late submissions are not judged.",
    "Judges' decision is final.",
    "Use of AI tools is allowed.",
  ],

  /** Weights add up to 100. */
  judging: [
    { name: "Creativity and originality of the event name", weight: 25 },
    { name: "Link between keywords and the idea", weight: 20 },
    { name: "Poster visual design and composition", weight: 30 },
    { name: "Clarity, typography and readability", weight: 15 },
    { name: "Overall impact and brand feel", weight: 10 },
  ],

  prizes: "Certificates",

  /** Coordinators, in the order they are shown. */
  contacts: [
    { name: "Harshwardhan Trivedi", phone: "+91 831 911 4465" },
    { name: "Yash Upadhyay", phone: "+91 84233 13611" },
    { name: "Suyash Vasal Jain", phone: "+91 93433 79736" },
  ],

  faqHeading: "FAQ",

  /** Questions and answers for the FAQ accordion, in order. */
  faq: [
    { question: "Who can participate?", answer: "SUAS students only." },
    { question: "Is there a fee?", answer: "No. It is free to participate." },
    { question: "Can I team up?", answer: "Yes, up to 2 people per entry." },
    { question: "What do I need to bring?", answer: "Your own laptop or device." },
    {
      question: "When do I get the keywords?",
      answer: "At the start of the event, all participants at once.",
    },
    { question: "Which tools can I use?", answer: "Any tools you like. AI tools are allowed." },
    {
      question: "How do I submit?",
      answer: "Through the website, with your event name and poster file, before the deadline.",
    },
    {
      question: "Who do I contact?",
      answer:
        "Harshwardhan Trivedi, +91 831 911 4465. Yash Upadhyay, +91 84233 13611. Suyash Vasal Jain, +91 93433 79736.",
    },
  ] as FaqItem[],

  /** Fixed choices on the registration form. The form, the server check and the admin screens all read these. */
  registration: {
    programs: ["B.Tech CSIT", "B.Tech SAR", "B.Tech AIML", "B.Sc SAR"],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
  },

  /** Footer labels. */
  footer: {
    register: "Register now",
    contactHeading: "Contact",
  },

  /** Organiser logos for the footer, in display order (files in public/logos, transparent and trimmed). */
  logos: [
    { src: "/logos/ieee-blue-clean.png", alt: "IEEE", width: 544, height: 160 },
    { src: "/logos/ieee-suas-sb-clean.png", alt: "IEEE SUAS Student Branch", width: 245, height: 241 },
    { src: "/logos/ieee-cs-clean.png", alt: "IEEE Computer Society, SUAS chapter", width: 250, height: 251 },
    { src: "/logos/ieee-wie-clean.png", alt: "IEEE Women in Engineering, SUAS", width: 243, height: 244 },
    { src: "/logos/suas-logo-clean.png", alt: "Symbiosis University of Applied Sciences", width: 1139, height: 240 },
  ],

  /**
   * Footer credit for the statue (the CC BY 4.0 licence requires it). One line,
   * written as pieces: a piece with `href` is a link, shown with that short text.
   */
  credit: [
    { text: "3D model 'David Head' by 1d_inc (" },
    { text: "sketchfab.com/1d_inc", href: "https://sketchfab.com/1d_inc" },
    { text: "), " },
    { text: "CC BY 4.0", href: "https://creativecommons.org/licenses/by/4.0/" },
    { text: ". Source: " },
    { text: "skfb.ly/oKvzW", href: "https://skfb.ly/oKvzW" },
    { text: ". Modified." },
  ] as CreditPiece[],
};

/** The three big blocks at the top of the Details section. */
export const detailFacts: Fact[] = [
  { label: "Date", value: siteContent.date },
  { label: "Venue", value: siteContent.venue },
  {
    label: "Participation",
    value: siteContent.participation,
    notes: [siteContent.eligibility, siteContent.fee, siteContent.bring],
  },
];
