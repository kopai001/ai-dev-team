// ─────────────────────────────────────────────────────────────
//  SLIDE DATA — edit this file to build your presentation
//
//  Available layouts:
//    'title'       — big title + subtitle (opening slide)
//    'section'     — section divider with accent background
//    'content'     — title + bullet points
//    'two-column'  — title + left/right columns
//    'quote'       — large pull quote + author
//    'image'       — full-bleed image + optional caption
//    'profile'     — self-introduction card
//    'gallery'     — eyebrow + title + photo grid
//    'hobby'       — photo grid + info sections
//    'product-cards' — horizontal cards with image + pros/cons
//    'timeline'    — horizontal timeline cards with icon + badge
//    'icon-list'   — title + subtitle + icon bullet items
//    'blank'       — empty canvas (add custom JSX via 'children')
// ─────────────────────────────────────────────────────────────

import { familyFeatured, familyColumns } from "./familyImages";
import { freetimeImages } from "./freetimeImages";
import bonmekLogo from "../Assets/Bonmek/bonmekTransparent.png";
import ourCustomers from "../Assets/Bonmek/our-customers.png";
import desktopApp from "../Assets/Bonmek/Desktop-app.avif";
import webApp from "../Assets/Bonmek/webApp.png";
import mobileApp from "../Assets/Bonmek/close-up-hand-holding-smartphone (1).jpg";
import iotImage from "../Assets/Bonmek/Iot.png";
import workflowAutomation from "../Assets/Bonmek/ai-workflow-automation.webp";
import bnkShow02 from "../Assets/Bonmek/BNK-SHOW-02.jpg";
import erDiagramPpSa from "../Assets/Bonmek/ER-Diagram-PP-SA.png";
import bnkShow from "../Assets/Bonmek/BNK-SHOW.jpg";
import phamaplex from "../Assets/Bonmek/Phamaplex.png";
import bismillah from "../Assets/Bonmek/Bismillah.png";
import iotProject from "../Assets/Bonmek/iot-project.png";
import ddcProject from "../Assets/Bonmek/กรมควบคุมโรค.png";
import thaiMap from "../Assets/Bonmek/ThaiMap.png";
import hurryup from "../Assets/Bonmek/Hurryup.png";

export const slides = [
  {
    id: 1,
    layout: "title",
    logo: bonmekLogo,
    // title: "Bonmek Co., Ltd.",
    subtitle: "เชื่อมโยงธุรกิจด้วยเทคโนโลยี",
    badge: "", // optional small badge above title
  },
  {
    id: 2,
    layout: "profile",
    eyebrow: "แนะนำตัว",
    nameTh: "สาธิน ปึงพิพัฒน์ตระกูล",
    nameEn: "Sathin Pungpipattrakul",
    nickname: "กอไผ่",
    birthYear: 1996,
    birthMonth: 2,
    birthDay: 8,
    email: "kopai.bmk@gmail.com",
    phone: "087-398-5100",
    line: "kopaisathin",
    location: "สงขลา หาดใหญ่",
  },
  {
    id: 3,
    layout: "gallery",
    eyebrow: "แนะนำตัว",
    title: "ครอบครัว",
    featured: familyFeatured,
    columns: familyColumns,
  },
  {
    id: 4,
    layout: "hobby",
    eyebrow: "แนะนำตัว",
    title: "งานอดิเรก",
    images: freetimeImages,
    sections: [
      {
        heading: "งานอดิเรก",
        items: [
          {
            label: "Freetime",
            value: "Youtube — Financial, Tech, World Politic",
          },
          { label: "Long Weekend", value: "Travel" },
          { label: "Interest", value: "Investment" },
          { label: "Sport", value: "Running" },
        ],
      },
      {
        heading: "เป้าหมาย",
        items: [
          { label: "Running", value: "ทำ sub50 ในระยะ 10km" },
          { label: "Investment", value: "ขยายการลงทุนในธุรกิจ New S Curve" },
        ],
      },
    ],
  },
  {
    id: 5,
    layout: "title",
    title: "บริษัท Bonmek จำกัด",
    subtitle: "ประวัติ ทำอะไร? อย่างไร? ผลงานของเรา",
    badge: "ธุรกิจของเรา", // optional small badge above title
  },
  {
    id: 6,
    layout: "image",
    src: ourCustomers,
    alt: "Our Customers",
    fit: "contain",
    bg: "#ffffff",
  },
  {
    id: 7,
    layout: "product-cards",
    eyebrow: "ธุรกิจของเรา",
    title: "Type of Product",
    cards: [
      {
        title: "Desktop Program",
        image: desktopApp,
        alt: "Desktop application",
        pros: ["เข้าถึงฮาร์ดแวร์ได้ดี", "ความปลอดภัยสูง"],
        cons: ["ติดตั้งยุ่งยาก", "จัดการเวอร์ชั่นยุ่งยาก", "ใช้พื้นที่จัดเก็บ"],
      },
      {
        title: "Web Application",
        image: webApp,
        alt: "Web application",
        pros: [
          "ใช้งานได้ทุกอุปกรณ์ผ่าน browser",
          "สำรองข้อมูลบน cloud",
          "ค่าบำรุงรักษาถูกกว่า",
        ],
        cons: ["Internet required", "Security"],
      },
      {
        title: "Mobile Application",
        image: mobileApp,
        alt: "Mobile application",
        pros: [
          "ประสบการณ์การใช้งานดีที่สุด",
          "Feature เฉพาะตัว",
          "ส่งเสริมภาพลักษณ์",
        ],
        cons: ["ต้นทุนสูง", "ต้องดูแลสองระบบ"],
      },
    ],
  },
  {
    id: 8,
    layout: "product-cards",
    eyebrow: "ธุรกิจของเรา",
    title: "Extra Feature",
    cards: [
      {
        title: "IoT (Internet Of Things)",
        image: iotImage,
        alt: "IoT system — industrial gateway and mobile monitoring",
        pros: [
          "ติดตามสถานะอุปกรณ์แบบ real-time",
          "เชื่อมต่อเครื่องจักรกับระบบ cloud",
          "ตัดสินใจจากข้อมูลที่วัดได้จริง",
        ],
      },
      {
        title: "Workflow Automation",
        image: workflowAutomation,
        alt: "AI workflow automation",
        pros: [
          "ลดงาน manual ที่ซ้ำซ้อน",
          "กระบวนการทำงานเร็วและสม่ำเสมอ",
          "ลด human error",
        ],
      },
    ],
  },
  {
    id: 9,
    layout: "timeline",
    eyebrow: "ธุรกิจของเรา",
    title: "กระบวนการพัฒนาโปรแกรม",
    steps: [
      {
        icon: "requirements",
        title: "Requirement Gathering",
        badge: "ศึกษาความต้องการลูกค้า",
        description: "รวบรวมและวิเคราะห์ความต้องการ เพื่อกำหนดขอบเขตและเป้าหมายของโครงการ",
      },
      {
        icon: "design",
        title: "System Design & Architecture",
        badges: ["UX/UI", "ER-Diagram", "DB"],
        description: "ออกแบบโครงสร้างระบบ หน้าจอผู้ใช้ และฐานข้อมูลให้สอดคล้องกับความต้องการ",
        thumbnails: [
          { src: bnkShow02, alt: "UX/UI mockup" },
          { src: erDiagramPpSa, alt: "ER-Diagram" },
        ],
      },
      {
        icon: "development",
        title: "Development",
        badge: "Coding & Testing",
        description: "พัฒนาโค้ด ทดสอบระบบ และปรับปรุงจนได้ซอฟต์แวร์ที่ใช้งานได้จริง",
      },
      {
        icon: "deploy",
        title: "Deploy & Maintenance",
        badge: "Go Live & Support",
        description: "นำระบบขึ้นใช้งานจริง และดูแลบำรุงรักษาอย่างต่อเนื่อง",
        thumbnails: [{ src: bnkShow, alt: "Deployed system showcase" }],
      },
    ],
  },
  {
    id: 10,
    layout: "image",
    eyebrow: "ธุรกิจของเรา",
    title: "My Product",
    src: phamaplex,
    alt: "Phamaplex — pharmaceutical e-commerce platform",
    fit: "contain",
    bg: "#ffffff",
  },
  {
    id: 11,
    layout: "image",
    eyebrow: "ธุรกิจของเรา",
    title: "My Product",
    src: bismillah,
    alt: "Bismillah — Muslim community mobile application",
    fit: "contain",
    bg: "#ffffff",
  },
  {
    id: 12,
    layout: "image",
    eyebrow: "ธุรกิจของเรา",
    title: "My Product",
    src: iotProject,
    alt: "IoT project — industrial monitoring device",
    fit: "contain",
    bg: "#ffffff",
  },
  {
    id: 13,
    layout: "image",
    eyebrow: "ธุรกิจของเรา",
    title: "My Product",
    src: ddcProject,
    alt: "Department of Disease Control — border checkpoint monitoring dashboard",
    fit: "contain",
    bg: "#ffffff",
  },
  {
    id: 14,
    layout: "two-column",
    eyebrow: "ธุรกิจของเรา",
    title: "Difference",
    left: {
      bullets: [
        "ดูแล พัฒนา เคียงข้างลูกค้า",
        "คุณภาพกทม.แต่ภูกกว่า",
        "มีงานอ้างอิง เป็นที่รู้จักในพื้นที่",
        "supervisor of PSU(Consult)",
        "Knowledge Base over 10 years (and always update)",
      ],
    },
    right: {
      image: {
        src: thaiMap,
        alt: "Bonmek Co., Ltd. — Support Area กรุงเทพฯ และภาคใต้",
      },
    },
  },
  {
    id: 15,
    layout: "icon-list",
    eyebrow: "ธุรกิจของเรา",
    title: "Customer",
    subtitle: "Focus Group: กลุ่มโรงงาน",
    items: [
      {
        icon: "trust",
        text: "เป็น Reference ที่ดีเพราะบริษัทอยู่ในช่วงการสร้างความน่าเชื่อถือ",
      },
      {
        icon: "key",
        text: "PKI ชัดเจน",
      },
      {
        icon: "investment",
        text: "มีกำลังในการลงทุน Technology",
      },
    ],
  },
  {
    id: 16,
    layout: "icon-list",
    title: "Lead Conversation",
    items: [
      {
        icon: "document",
        text: "แปลงเอกสารเป็น digital",
      },
      {
        icon: "human-error",
        text: "Human Error",
      },
      {
        icon: "performance",
        text: "มีปัญหาการควบคุมคุณภาพ, ควบคุมประสิทธิภาพ",
      },
      {
        icon: "ipo",
        text: "ต้องการจะ IPO",
      },
    ],
  },
  {
    id: 17,
    layout: "two-column",
    left: {
      heading: "Hurry Up",
      image: {
        src: hurryup,
        alt: "Hurry Up — ระดับความเร่งด่วน 1 ถึง 5",
      },
    },
    right: {
      heading: "Ref Not match",
      items: [
        {
          icon: "extension",
          text: "ทำระบบต่อยอดจากของคนอื่น",
        },
        {
          icon: "roi",
          text: "ลูกค้าไม่เข้าใจความคุ้มทุนที่จะทำ",
        },
        {
          icon: "low-priority",
          text: "ลูกค้าไม่ให้ความสำคัญกับระบบหรือโปรแกรม ทำฟรี",
        },
        {
          icon: "no-authority",
          text: "ลูกค้าไม่มีอำนาจตัดสินใจ หรือปรับพฤติกรรม พนักงาน",
        },
      ],
    },
  },
  // {
  //   id: 5,
  //   layout: "content",
  //   title: "Key Points",
  //   bullets: [
  //     "First key point goes here",
  //     "Second key point goes here",
  //     "Third key point goes here",
  //     "Fourth key point goes here",
  //   ],
  // },
  // {
  //   id: 6,
  //   layout: "two-column",
  //   title: "Side by Side",
  //   left: {
  //     heading: "Before",
  //     bullets: ["Manual process", "Slow feedback", "High error rate"],
  //   },
  //   right: {
  //     heading: "After",
  //     bullets: ["Automated flow", "Real-time data", "Near-zero errors"],
  //   },
  // },
  // {
  //   id: 7,
  //   layout: "quote",
  //   quote: "The best way to predict the future is to create it.",
  //   author: "Peter Drucker",
  // },
  // {
  //   id: 8,
  //   layout: "title",
  //   title: "Thank You",
  //   subtitle: "Questions?",
  // },
];
