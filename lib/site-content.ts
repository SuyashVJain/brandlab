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

  contact: {
    name: "Suyash Vasal Jain",
    phone: "9343379736",
  },

  /** For the FAQ section (not built yet). */
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
    { question: "Who do I contact?", answer: "Suyash Vasal Jain, 9343379736." },
  ] as FaqItem[],

  /** For the footer (not built yet). */
  credits: [
    "3D model 'David Head' by 1d_inc (https://sketchfab.com/1d_inc), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Source: https://skfb.ly/oKvzW. Modified: material and shader effects applied.",
    "Mountain photo by Pietro Dona on Unsplash.",
  ],
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
