type NavigationLink = { label: string; href: string };
export type NavigationSection = NavigationLink & { children?: NavigationLink[] };

const schoolPage = (title: string, pid: number): NavigationLink => ({
  label: title,
  href: `/page?${new URLSearchParams({ title, pid: String(pid) })}`,
});

export const schoolNavigation: NavigationSection[] = [
  { label: "Home", href: "/" },
  {
    label: "Our school",
    href: "/#our-school",
    children: [
      schoolPage("All Angels - After School Care", 24),
      schoolPage("British Values", 36),
      schoolPage("Christian Ethos", 25),
      schoolPage("Friends of Hallaton", 34),
      schoolPage("GDPR", 32),
      schoolPage("Governing Body", 29),
      schoolPage("Mental Health & Wellbeing", 95),
      schoolPage("Ofsted and SIAMS", 23),
      schoolPage("Operation Encompass", 74),
      schoolPage("Our 5 R Stars", 20),
      schoolPage("Pupil Premium", 76),
      schoolPage("South Leicestershire Collaborative Partnership ( SLCP )", 30),
      schoolPage("Sport", 33),
      schoolPage("Staff", 21),
      schoolPage("Statutory Information", 91),
      schoolPage("The School Day", 22),
    ],
  },
  {
    label: "Parent information",
    href: "/#parents",
    children: [
      schoolPage("School Lunches/Milk/Fruit", 51),
      schoolPage("COVID 19 INFORMATION", 72),
      schoolPage("Admissions", 73),
      schoolPage("Wrap Around Care", 50),
      schoolPage("Downloadable Forms For Parents", 108),
      schoolPage("Keeping Safe", 39),
      schoolPage("Online Safety", 101),
      schoolPage("Performance Tables", 48),
      schoolPage("Policies", 47),
      schoolPage("School Nurse", 77),
      schoolPage("Special Educational Needs (SEN)", 52),
      schoolPage("Term Dates/Holidays", 49),
      schoolPage("Transport Arrangements", 46),
      schoolPage("Uniform", 38),
    ],
  },
  {
    label: "Curriculum",
    href: "/#learning",
    children: [
      schoolPage("Art & Design", 96),
      schoolPage("Computing", 98),
      schoolPage("Design and Technology", 85),
      schoolPage("English", 88),
      schoolPage("Enrichment", 58),
      schoolPage("EYFS", 93),
      schoolPage("French - MFL", 92),
      schoolPage("Geography", 82),
      schoolPage("History", 64),
      schoolPage("Maths", 90),
      schoolPage("Music", 100),
      schoolPage("P.E.", 107),
      schoolPage("Phonics", 87),
      schoolPage("PSHCE and RSE", 84),
      schoolPage("Religious Education", 83),
      schoolPage("Science", 75),
    ],
  },
  {
    label: "News & events",
    href: "/#news",
    children: [
      { label: "Calendar of Events", href: "/#news" },
      { label: "Latest News", href: "/#news" },
      schoolPage("Newsletters", 16),
    ],
  },
  { label: "Contact us", href: "/contact" },
  {
    label: "Class pages",
    href: "/page?title=Class+Pages&pid=102",
    children: [
      schoolPage("Maple Class", 104),
      schoolPage("Oak Class", 106),
      schoolPage("Willow Class", 103),
    ],
  },
];
