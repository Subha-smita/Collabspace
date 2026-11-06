// Built-in page templates (client-safe: plain data, no database imports).
type Mark = { type: string };
export type N = { type: string; attrs?: Record<string, unknown>; content?: N[]; text?: string; marks?: Mark[] };
export type ShapeSeed = { kind: 'rect' | 'ellipse' | 'sticky' | 'text' | 'line'; x: number; y: number; w: number; h: number; fill?: string; text?: string };
export const CATEGORIES = ['All', 'Project Management', 'Personal Planning', 'Education & Study', 'Business & Work', 'Meeting Notes', 'Content Planning', 'Productivity'] as const;
export type Category = Exclude<(typeof CATEGORIES)[number], 'All'>;
export type Template = { key: string; name: string; desc: string; icon: string; kind: 'DOC' | 'CANVAS'; category: Category; featured?: boolean; cover?: [string, string]; doc?: N; shapes?: ShapeSeed[] };

const t = (text: string, bold = false): N => (bold ? { type: 'text', text, marks: [{ type: 'bold' }] } : { type: 'text', text });
const p = (text = ''): N => (text ? { type: 'paragraph', content: [t(text)] } : { type: 'paragraph' });
const h = (level: number, text: string): N => ({ type: 'heading', attrs: { level }, content: [t(text)] });
const ul = (items: string[]): N => ({ type: 'bulletList', content: items.map((i) => ({ type: 'listItem', content: [p(i)] })) });
const todo = (items: string[]): N => ({ type: 'taskList', content: items.map((i) => ({ type: 'taskItem', attrs: { checked: false }, content: [p(i)] })) });
const table = (head: string[], rows: string[][]): N => ({
  type: 'table',
  content: [
    { type: 'tableRow', content: head.map((c) => ({ type: 'tableHeader', content: [p(c)] })) },
    ...rows.map((r) => ({ type: 'tableRow', content: r.map((c) => ({ type: 'tableCell', content: [p(c)] })) })),
  ],
});
const doc = (...content: N[]): N => ({ type: 'doc', content });

const G = '#e6f0e6', B = '#e7f0f7', Y = '#fbf3db', R = '#f5e0e9', S = '#ebeae6', W = '#ffffff';

type Raw = Omit<Template, 'category'> & { category: string };
const RAW: Raw[] = [
  {
    key: 'meeting-notes', name: 'Meeting notes', icon: '📝', kind: 'DOC', category: 'Work', featured: true, desc: 'Agenda, discussion, decisions and action items.',
    doc: doc(h(2, 'Details'), ul(['Date: ', 'Attendees: ', 'Facilitator: ']), h(2, 'Agenda'), ul(['Topic 1', 'Topic 2', 'Topic 3']), h(2, 'Discussion notes'), p(), h(2, 'Decisions'), ul(['']), h(2, 'Action items'), todo(['Task — owner — due date'])),
  },
  {
    key: 'project-plan', name: 'Project plan', icon: '🗂️', kind: 'DOC', category: 'Work', desc: 'Goals, milestones, risks and next steps.',
    doc: doc(h(2, 'Overview'), p('What are we building and why?'), h(2, 'Goals'), ul(['Goal 1', 'Goal 2']), h(2, 'Milestones'), table(['Milestone', 'Owner', 'Due', 'Status'], [['Kick-off', '', '', 'Not started'], ['First draft', '', '', 'Not started'], ['Launch', '', '', 'Not started']]), h(2, 'Risks'), ul(['Risk and how we will handle it']), h(2, 'Next steps'), todo(['Define scope', 'Assign owners'])),
  },
  {
    key: 'prd', name: 'Product requirements', icon: '📋', kind: 'DOC', category: 'Work', desc: 'Problem, users, requirements and success metrics.',
    doc: doc(h(2, 'Problem statement'), p('Describe the problem and who has it.'), h(2, 'Target users'), ul(['Persona 1', 'Persona 2']), h(2, 'Requirements'), table(['Priority', 'Requirement', 'Notes'], [['Must', '', ''], ['Should', '', ''], ['Could', '', '']]), h(2, 'Success metrics'), ul(['Metric and target']), h(2, 'Out of scope'), ul(['']), h(2, 'Open questions'), todo(['Question to resolve'])),
  },
  {
    key: 'bug-report', name: 'Bug report', icon: '🐞', kind: 'DOC', category: 'Work', desc: 'Steps to reproduce, expected vs actual, environment.',
    doc: doc(h(2, 'Summary'), p('One sentence describing the bug.'), h(2, 'Steps to reproduce'), ul(['Step 1', 'Step 2', 'Step 3']), h(2, 'Expected result'), p(), h(2, 'Actual result'), p(), h(2, 'Environment'), table(['Item', 'Value'], [['Browser', ''], ['Operating system', ''], ['Version', '']]), h(2, 'Screenshots'), p('Use the Image button in the toolbar to add screenshots from your computer.')),
  },
  {
    key: 'retro', name: 'Sprint retrospective', icon: '🔁', kind: 'DOC', category: 'Work', desc: 'What went well, what did not, and what to change.',
    doc: doc(h(2, 'What went well'), ul(['']), h(2, 'What did not go well'), ul(['']), h(2, 'Ideas to try'), ul(['']), h(2, 'Action items'), todo(['Action — owner'])),
  },
  {
    key: 'okrs', name: 'Goals & OKRs', icon: '🎯', kind: 'DOC', category: 'Planning', desc: 'Objectives with measurable key results.',
    doc: doc(h(2, 'Objective'), p('What do we want to achieve this quarter?'), h(2, 'Key results'), table(['Key result', 'Target', 'Current', 'Status'], [['', '', '', ''], ['', '', '', ''], ['', '', '', '']]), h(2, 'Initiatives'), todo(['Initiative 1', 'Initiative 2']), h(2, 'Notes'), p()),
  },
  {
    key: 'weekly-planner', name: 'Weekly planner', icon: '📅', kind: 'DOC', category: 'Planning', desc: 'Plan your week day by day.',
    doc: doc(h(2, 'Weekly goals'), todo(['Goal 1', 'Goal 2', 'Goal 3']), ...['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend'].flatMap((d) => [h(3, d), todo([''])]), h(2, 'Notes'), p()),
  },
  {
    key: 'todo-list', name: 'To-do list', icon: '✅', kind: 'DOC', category: 'Personal', desc: 'Simple checklists for today, this week and later.',
    doc: doc(h(2, 'Today'), todo(['', '', '']), h(2, 'This week'), todo(['', '']), h(2, 'Later'), todo([''])),
  },
  {
    key: 'daily-journal', name: 'Daily journal', icon: '📖', kind: 'DOC', category: 'Personal', desc: 'Gratitude, priorities and reflection.',
    doc: doc(h(2, 'Gratitude'), ul(['', '', '']), h(2, 'Top priorities'), todo(['', '', '']), h(2, 'Notes'), p(), h(2, 'Reflection'), p('What went well today? What would I change?')),
  },
  {
    key: 'study-notes', name: 'Study notes', icon: '🎓', kind: 'DOC', category: 'Student', desc: 'Key concepts, summary and review questions.',
    doc: doc(h(2, 'Topic'), p(), h(2, 'Key concepts'), ul(['Concept — definition']), h(2, 'Summary'), p(), h(2, 'Questions to review'), todo(['Question 1', 'Question 2']), h(2, 'Resources'), ul(['']))
  },
  {
    key: 'brainstorm', name: 'Brainstorm board', icon: '💡', kind: 'CANVAS', category: 'Canvas', desc: 'A central idea with sticky notes around it.',
    shapes: [
      { kind: 'ellipse', x: 380, y: 230, w: 240, h: 120, fill: B, text: 'Main idea' },
      { kind: 'sticky', x: 120, y: 80, w: 180, h: 150, fill: Y, text: 'Idea' },
      { kind: 'sticky', x: 410, y: 40, w: 180, h: 150, fill: G, text: 'Idea' },
      { kind: 'sticky', x: 700, y: 80, w: 180, h: 150, fill: R, text: 'Idea' },
      { kind: 'sticky', x: 120, y: 360, w: 180, h: 150, fill: B, text: 'Idea' },
      { kind: 'sticky', x: 410, y: 400, w: 180, h: 150, fill: Y, text: 'Idea' },
      { kind: 'sticky', x: 700, y: 360, w: 180, h: 150, fill: G, text: 'Idea' },
    ],
  },
  {
    key: 'kanban', name: 'Kanban board', icon: '📌', kind: 'CANVAS', category: 'Canvas', featured: true, desc: 'To do, In progress and Done columns.',
    shapes: [
      { kind: 'rect', x: 60, y: 60, w: 280, h: 460, fill: S }, { kind: 'rect', x: 380, y: 60, w: 280, h: 460, fill: S }, { kind: 'rect', x: 700, y: 60, w: 280, h: 460, fill: S },
      { kind: 'text', x: 80, y: 70, w: 240, h: 36, text: 'To do' }, { kind: 'text', x: 400, y: 70, w: 240, h: 36, text: 'In progress' }, { kind: 'text', x: 720, y: 70, w: 240, h: 36, text: 'Done' },
      { kind: 'sticky', x: 80, y: 120, w: 240, h: 90, fill: Y, text: 'Task' }, { kind: 'sticky', x: 80, y: 230, w: 240, h: 90, fill: Y, text: 'Task' },
      { kind: 'sticky', x: 400, y: 120, w: 240, h: 90, fill: B, text: 'Task' }, { kind: 'sticky', x: 720, y: 120, w: 240, h: 90, fill: G, text: 'Task' },
    ],
  },
  {
    key: 'flowchart', name: 'Flowchart', icon: '🔀', kind: 'CANVAS', category: 'Canvas', desc: 'Start, steps, a decision and an end.',
    shapes: [
      { kind: 'ellipse', x: 360, y: 30, w: 180, h: 70, fill: G, text: 'Start' },
      { kind: 'line', x: 450, y: 100, w: 0, h: 50 },
      { kind: 'rect', x: 360, y: 150, w: 180, h: 70, fill: W, text: 'Step 1' },
      { kind: 'line', x: 450, y: 220, w: 0, h: 50 },
      { kind: 'rect', x: 360, y: 270, w: 180, h: 80, fill: Y, text: 'Decision?' },
      { kind: 'line', x: 400, y: 350, w: -140, h: 60 }, { kind: 'line', x: 500, y: 350, w: 140, h: 60 },
      { kind: 'rect', x: 140, y: 410, w: 200, h: 70, fill: W, text: 'Yes: do this' }, { kind: 'rect', x: 560, y: 410, w: 200, h: 70, fill: W, text: 'No: do that' },
      { kind: 'line', x: 240, y: 480, w: 170, h: 60 }, { kind: 'line', x: 660, y: 480, w: -170, h: 60 },
      { kind: 'ellipse', x: 360, y: 540, w: 180, h: 70, fill: R, text: 'End' },
    ],
  },
  {
    key: 'swot', name: 'SWOT analysis', icon: '🧭', kind: 'CANVAS', category: 'Canvas', desc: 'Strengths, weaknesses, opportunities, threats.',
    shapes: [
      { kind: 'rect', x: 60, y: 60, w: 420, h: 260, fill: G }, { kind: 'rect', x: 500, y: 60, w: 420, h: 260, fill: R },
      { kind: 'rect', x: 60, y: 340, w: 420, h: 260, fill: B }, { kind: 'rect', x: 500, y: 340, w: 420, h: 260, fill: Y },
      { kind: 'text', x: 80, y: 70, w: 380, h: 36, text: 'Strengths' }, { kind: 'text', x: 520, y: 70, w: 380, h: 36, text: 'Weaknesses' },
      { kind: 'text', x: 80, y: 350, w: 380, h: 36, text: 'Opportunities' }, { kind: 'text', x: 520, y: 350, w: 380, h: 36, text: 'Threats' },
    ],
  },
  // ---- Student ----
  {
    key: 'assignment-tracker', name: 'Assignment & deadline tracker', icon: '📚', kind: 'DOC', category: 'Student', desc: 'Track every assignment, due date and grade in one table.',
    doc: doc(h(2, 'This week'), todo(['', '', '']), h(2, 'All assignments'), table(['Assignment', 'Course', 'Due date', 'Priority', 'Status', 'Grade'], [['', '', '', '', 'Not started', ''], ['', '', '', '', 'Not started', ''], ['', '', '', '', 'Not started', ''], ['', '', '', '', 'Not started', '']]), h(2, 'Notes'), p()),
  },
  {
    key: 'cornell-notes', name: 'Cornell notes', icon: '🗒️', kind: 'DOC', category: 'Student', desc: 'Title, cues, notes and a summary, the classic Cornell layout.',
    doc: doc(ul(['Title: ', 'Subject: ', 'Date: ']), table(['Cues / questions', 'Notes'], [['', ''], ['', ''], ['', '']]), h(2, 'Summary'), p('Summarise this page of notes in two or three sentences.')),
  },
  {
    key: 'student-dashboard', name: 'Student dashboard', icon: '🌸', kind: 'DOC', category: 'Student', desc: 'Today, courses, exams and a study log on one page.',
    cover: ['#fde7ef', '#f8c8d8'],
    doc: doc(h(2, 'Today'), todo(['', '', '']), h(2, 'Courses'), table(['Course', 'Instructor', 'Room', 'Days'], [['', '', '', ''], ['', '', '', ''], ['', '', '', '']]), h(2, 'Upcoming exams'), table(['Exam', 'Date', 'Topics'], [['', '', ''], ['', '', '']]), h(2, 'Study log'), table(['Date', 'Subject', 'Hours', 'What I covered'], [['', '', '', ''], ['', '', '', '']])),
  },
  {
    key: 'class-schedule', name: 'Class schedule', icon: '🏫', kind: 'DOC', category: 'Student', desc: 'A weekly timetable for your classes.',
    doc: doc(table(['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'], [['9:00', '', '', '', '', ''], ['10:00', '', '', '', '', ''], ['11:00', '', '', '', '', ''], ['12:00', '', '', '', '', ''], ['14:00', '', '', '', '', ''], ['15:00', '', '', '', '', '']]), h(2, 'Notes'), p()),
  },
  // ---- Finance ----
  {
    key: 'expense-tracker', name: 'Expense & budget tracker', icon: '💸', kind: 'DOC', category: 'Finance', desc: 'Log spending and compare it with your monthly budget.',
    cover: ['#dcefe0', '#b9dcc2'],
    doc: doc(h(2, 'Monthly budget'), table(['Category', 'Budget', 'Spent', 'Left'], [['Food', '', '', ''], ['Transport', '', '', ''], ['Bills', '', '', ''], ['Fun', '', '', ''], ['Other', '', '', '']]), h(2, 'Expenses'), table(['Date', 'Description', 'Category', 'Amount'], [['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']]), h(2, 'Notes'), p()),
  },
  {
    key: 'simple-budget', name: 'Simple budget & finance tracker', icon: '🏦', kind: 'DOC', category: 'Finance', desc: 'Income, fixed and variable costs, and savings in one place.',
    doc: doc(h(2, 'Income'), table(['Source', 'Amount'], [['', ''], ['', '']]), h(2, 'Fixed expenses'), table(['Item', 'Amount', 'Due day'], [['Rent', '', ''], ['Utilities', '', ''], ['Subscriptions', '', '']]), h(2, 'Variable expenses'), table(['Item', 'Planned', 'Actual'], [['Groceries', '', ''], ['Transport', '', '']]), h(2, 'Savings goals'), table(['Goal', 'Target', 'Saved so far'], [['', '', ''], ['', '', '']])),
  },
  {
    key: 'wishlist', name: 'Wishlist', icon: '🛒', kind: 'DOC', category: 'Finance', desc: 'Things you want, with price, priority and status.',
    doc: doc(table(['Item', 'Price', 'Priority', 'Link', 'Status'], [['', '', 'High', '', 'Wanted'], ['', '', 'Medium', '', 'Wanted'], ['', '', 'Low', '', 'Wanted'], ['', '', '', '', '']]), h(2, 'Notes'), p()),
  },
  {
    key: 'savings-goals', name: 'Savings goals', icon: '🐷', kind: 'DOC', category: 'Finance', desc: 'Set a target and track what you save each month.',
    doc: doc(h(2, 'Goal'), p('What are you saving for, and by when?'), table(['Month', 'Saved', 'Running total'], [['', '', ''], ['', '', ''], ['', '', ''], ['', '', '']]), h(2, 'Ideas to save more'), ul([''])),
  },
  // ---- Productivity ----
  {
    key: 'habit-tracker', name: 'Habit tracker', icon: '🌵', kind: 'DOC', category: 'Productivity', desc: 'Check off your habits every day of the week.',
    cover: ['#fdf0cf', '#f6dc9b'],
    doc: doc(table(['Habit', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [['Read 10 pages', '', '', '', '', '', '', ''], ['Exercise', '', '', '', '', '', '', ''], ['8 hours of sleep', '', '', '', '', '', '', ''], ['Drink water', '', '', '', '', '', '', '']]), h(2, 'Reflection'), p('What helped me keep the streak this week?')),
  },
  {
    key: 'yearly-planner', name: 'Yearly planner', icon: '🗓️', kind: 'DOC', category: 'Productivity', desc: 'Goals for the year, then a short plan for each month.',
    doc: doc(h(2, 'Goals for the year'), todo(['', '', '']), ...['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].flatMap((m) => [h(3, m), ul([''])])),
  },
  {
    key: 'reading-list', name: 'Reading list', icon: '📖', kind: 'DOC', category: 'Productivity', desc: 'Books to read, in progress and finished.',
    doc: doc(table(['Title', 'Author', 'Status', 'Rating', 'Notes'], [['', '', 'To read', '', ''], ['', '', 'Reading', '', ''], ['', '', 'Finished', '', '']])),
  },
  // ---- Planning / Work ----
  {
    key: 'daily-planner', name: 'Daily Planner', icon: '☀️', kind: 'DOC', category: 'Planning', featured: true, desc: 'Plan your day: top priorities, a time schedule and an evening review.',
    cover: ['#fdf0cf', '#f6dc9b'],
    doc: doc(h(2, 'Top 3 priorities'), todo(['', '', '']), h(2, 'Schedule'), table(['Time', 'Plan', 'Done'], [['8:00', '', ''], ['10:00', '', ''], ['12:00', '', ''], ['14:00', '', ''], ['16:00', '', ''], ['18:00', '', '']]), h(2, 'Tasks'), todo(['', '', '']), h(2, 'Notes'), p(), h(2, 'Evening review'), p('What went well today? What will I do differently tomorrow?')),
  },
  {
    key: 'project-dashboard', name: 'Project Management Dashboard', icon: '📊', kind: 'DOC', category: 'Work', featured: true, desc: 'Status, tasks, milestones, risks and a decision log in one place.',
    cover: ['#dfeaf6', '#bcd3ee'],
    doc: doc(h(2, 'Project summary'), table(['Project', 'Owner', 'Start', 'Target date', 'Status'], [['', '', '', '', 'On track']]), h(2, 'Tasks'), table(['Task', 'Owner', 'Due', 'Priority', 'Status'], [['', '', '', 'High', 'To do'], ['', '', '', 'Medium', 'To do'], ['', '', '', 'Low', 'To do']]), h(2, 'Milestones'), table(['Milestone', 'Date', 'Status'], [['', '', 'Not started'], ['', '', 'Not started']]), h(2, 'Risks'), table(['Risk', 'Impact', 'Mitigation'], [['', '', ''], ['', '', '']]), h(2, 'Decision log'), ul([''])),
  },
  {
    key: 'team-workspace', name: 'Team Workspace', icon: '👥', kind: 'DOC', category: 'Work', desc: 'A home page for your team: mission, members, rituals and links.',
    doc: doc(h(2, 'Our mission'), p('Why does this team exist?'), h(2, 'Team members'), table(['Name', 'Role', 'Focus', 'Contact'], [['', '', '', ''], ['', '', '', ''], ['', '', '', '']]), h(2, 'Team rituals'), table(['Ritual', 'When', 'Who'], [['Weekly sync', '', ''], ['Retro', '', '']]), h(2, 'Current priorities'), todo(['', '', '']), h(2, 'Important links'), ul(['']), h(2, 'Announcements'), p()),
  },
  {
    key: 'goal-tracker', name: 'Goal Tracker', icon: '🏆', kind: 'DOC', category: 'Productivity', featured: true, desc: 'Turn goals into steps and review your progress every month.',
    doc: doc(h(2, 'Goals'), table(['Goal', 'Why it matters', 'Deadline', 'Progress'], [['', '', '', '0%'], ['', '', '', '0%'], ['', '', '', '0%']]), h(2, 'Next steps'), todo(['', '', '']), h(2, 'Monthly review'), table(['Month', 'What I achieved', 'What to change'], [['', '', ''], ['', '', '']]), h(2, 'Wins'), ul([''])),
  },
  {
    key: 'developer-workspace', name: 'Developer Workspace', icon: '💻', kind: 'DOC', category: 'Work', desc: 'Setup notes, architecture, API reference, tasks and a bug list.',
    doc: doc(h(2, 'Getting started'), ul(['Clone the repository', 'Install dependencies', 'Copy .env.example to .env', 'Run the dev server']), h(2, 'Architecture'), p('Describe the main services and how they talk to each other.'), h(2, 'API reference'), table(['Method', 'Endpoint', 'Description'], [['GET', '/api/', ''], ['POST', '/api/', '']]), h(2, 'Tasks'), todo(['', '', '']), h(2, 'Bugs'), table(['Bug', 'Severity', 'Status'], [['', '', 'Open'], ['', '', 'Open']]), h(2, 'Release notes'), ul([''])),
  },
  {
    key: 'business-plan', name: 'Business Plan', icon: '💼', kind: 'DOC', category: 'Work', desc: 'Problem, solution, market, model, team and financial plan.',
    doc: doc(h(2, 'Executive summary'), p('Summarise the business in a short paragraph.'), h(2, 'Problem'), p(), h(2, 'Solution'), p(), h(2, 'Target market'), ul(['Who are the customers?', 'How big is the market?']), h(2, 'Business model'), p('How will you make money?'), h(2, 'Marketing & sales'), p(), h(2, 'Team'), table(['Name', 'Role', 'Experience'], [['', '', ''], ['', '', '']]), h(2, 'Financial plan'), table(['Item', 'Year 1', 'Year 2', 'Year 3'], [['Revenue', '', '', ''], ['Costs', '', '', ''], ['Profit', '', '', '']]), h(2, 'Milestones'), todo(['', '', ''])),
  },
  {
    key: 'knowledge-base', name: 'Knowledge Base', icon: '🧠', kind: 'DOC', category: 'Work', featured: true, desc: 'A searchable home for guides, FAQs, policies and how-tos.',
    doc: doc(h(2, 'Start here'), p('Welcome. Find the answers to common questions below.'), h(2, 'Guides'), ul(['How to get set up', 'How we work', 'Tools we use']), h(2, 'FAQ'), table(['Question', 'Answer'], [['', ''], ['', ''], ['', '']]), h(2, 'Policies'), ul(['']), h(2, 'Contacts'), table(['Topic', 'Who to ask'], [['', ''], ['', '']]), h(2, 'Recently updated'), ul([''])),
  },
  {
    key: 'project-roadmap', name: 'Project Roadmap', icon: '🗺️', kind: 'DOC', category: 'Planning', desc: 'Plan releases by quarter: themes, features and status.',
    doc: doc(h(2, 'Vision'), p('Where are we going and why?'), h(2, 'Q1'), table(['Feature', 'Owner', 'Status'], [['', '', 'Planned'], ['', '', 'Planned']]), h(2, 'Q2'), table(['Feature', 'Owner', 'Status'], [['', '', 'Planned'], ['', '', 'Planned']]), h(2, 'Q3'), table(['Feature', 'Owner', 'Status'], [['', '', 'Planned'], ['', '', 'Planned']]), h(2, 'Q4'), table(['Feature', 'Owner', 'Status'], [['', '', 'Planned'], ['', '', 'Planned']]), h(2, 'Backlog'), ul([''])),
  },
  {
    key: 'content-calendar', name: 'Content calendar', icon: '🗓️', kind: 'DOC', category: 'Content Planning', featured: true, desc: 'Plan posts by date, channel and status.',
    doc: doc(h(2, 'This month'), p('Use the calendar block (Insert → Calendar) for a month view, and the table below to track each piece.'), table(['Date', 'Channel', 'Topic', 'Owner', 'Status'], [['', '', '', '', 'Idea'], ['', '', '', '', 'Idea'], ['', '', '', '', 'Idea']]), h(2, 'Ideas backlog'), ul(['']), h(2, 'Publishing checklist'), todo(['Draft', 'Edit', 'Design assets', 'Schedule'])),
  },
  {
    key: 'blog-planner', name: 'Blog post planner', icon: '✍️', kind: 'DOC', category: 'Content Planning', desc: 'Outline, keywords and a publishing checklist.',
    doc: doc(h(2, 'Working title'), p(), h(2, 'Audience & goal'), p(), h(2, 'Outline'), ul(['Intro', 'Main point 1', 'Main point 2', 'Conclusion']), h(2, 'Keywords'), ul(['']), h(2, 'Checklist'), todo(['Draft', 'Edit', 'Add images', 'Publish'])),
  },
  {
    key: 'social-planner', name: 'Social media planner', icon: '📣', kind: 'DOC', category: 'Content Planning', desc: 'Campaign goals and a post schedule per platform.',
    doc: doc(h(2, 'Campaign goal'), p(), h(2, 'Post schedule'), table(['Platform', 'Date', 'Post idea', 'Asset', 'Status'], [['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']]), h(2, 'Metrics to track'), ul(['Reach', 'Engagement', 'Clicks'])),
  },
];

export const getTemplate = (key: string | undefined | null) => TEMPLATES.find((x) => x.key === key);


// Map the original groupings onto the gallery categories (per-key overrides first).
const BY_KEY: Record<string, Category> = {
  'meeting-notes': 'Meeting Notes', retro: 'Meeting Notes', 'project-plan': 'Project Management', prd: 'Project Management', 'bug-report': 'Project Management',
  okrs: 'Project Management', kanban: 'Project Management', 'project-dashboard': 'Project Management', 'project-roadmap': 'Project Management',
  brainstorm: 'Content Planning', 'reading-list': 'Personal Planning', 'expense-tracker': 'Personal Planning', 'simple-budget': 'Personal Planning', wishlist: 'Personal Planning', 'savings-goals': 'Personal Planning',
};
const BY_OLD: Record<string, Category> = { Student: 'Education & Study', Work: 'Business & Work', Planning: 'Personal Planning', Personal: 'Personal Planning', Finance: 'Personal Planning', Productivity: 'Productivity', Canvas: 'Business & Work' };
export const TEMPLATES: Template[] = RAW.map((r) => ({ ...r, category: BY_KEY[r.key] ?? ((CATEGORIES as readonly string[]).includes(r.category) ? (r.category as Category) : BY_OLD[r.category] ?? 'Productivity') }));
