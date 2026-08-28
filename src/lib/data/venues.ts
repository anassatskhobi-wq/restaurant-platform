import type { Locale } from "@/lib/i18n";

// NOTE: This is placeholder/seed data for the demo slice.
// In later phases this moves into the database (see prisma/schema.prisma)
// and gets edited through the admin menu editor.
//
// "pomodoro" below is still a placeholder — replace with the real
// Pomodoro menu before showing it to guests.
//
// "chicago-style" was built from the venue's real public Wolt listing
// (wolt.com/ka/geo/tbilisi/restaurant/chicago-style) on 2026-08-26 —
// Georgian names/prices are the source of truth from Wolt; Russian and
// English names are translations added here and should be checked
// against how you actually want them worded before going live.

export type MenuItem = {
  slug: string;
  priceGel: number;
  // Скидка/наценка (%) на самом гостевом QR-меню — необязательное поле
  // (у демо-данных ниже его нет), когда задано — на странице показывается
  // перечёркнутая базовая цена и рядом цена со скидкой.
  discountMenuPercent?: number | null;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  available: boolean;
  photoUrl?: string;
};

export type MenuCategory = {
  slug: string;
  name: Record<Locale, string>;
  items: MenuItem[];
};

export type Venue = {
  slug: string;
  brandColor: string;
  name: Record<Locale, string>;
  address: Record<Locale, string>;
  categories: MenuCategory[];
};

export const venues: Record<string, Venue> = {
  pomodoro: {
    slug: "pomodoro",
    brandColor: "#c0392b",
    name: {
      ka: "პიცერია პომოდორო",
      ru: "Пиццерия Pomodoro",
      en: "Pizzeria Pomodoro",
    },
    address: {
      ka: "ილია ვეკუას ქუჩა 23ბ, თბილისი",
      ru: "ул. Илии Векуа 23б, Тбилиси",
      en: "Ilia Vekua St 23b, Tbilisi",
    },
    categories: [
      {
        slug: "pizza",
        name: { ka: "პიცა", ru: "Пицца", en: "Pizza" },
        items: [
          {
            slug: "margherita",
            priceGel: 19,
            available: true,
            name: { ka: "მარგარიტა", ru: "Маргарита", en: "Margherita" },
            description: {
              ka: "პომიდვრის სოუსი, მოცარელა, ბაზილიკი",
              ru: "Томатный соус, моцарелла, базилик",
              en: "Tomato sauce, mozzarella, basil",
            },
          },
          {
            slug: "pepperoni",
            priceGel: 23,
            available: true,
            name: { ka: "პეპერონი", ru: "Пепперони", en: "Pepperoni" },
            description: {
              ka: "პომიდვრის სოუსი, მოცარელა, პეპერონის სალიამი",
              ru: "Томатный соус, моцарелла, салями пепперони",
              en: "Tomato sauce, mozzarella, pepperoni salami",
            },
          },
          {
            slug: "quattro-formaggi",
            priceGel: 26,
            available: true,
            name: { ka: "ოთხი ყველი", ru: "Четыре сыра", en: "Quattro Formaggi" },
            description: {
              ka: "მოცარელა, გორგონზოლა, პარმეზანი, ფონტინა",
              ru: "Моцарелла, горгонзола, пармезан, фонтина",
              en: "Mozzarella, gorgonzola, parmesan, fontina",
            },
          },
          {
            slug: "diavola",
            priceGel: 24,
            available: true,
            name: { ka: "დიავოლა", ru: "Дьявола", en: "Diavola" },
            description: {
              ka: "ცხარე სალიამი, მოცარელა, ცხარე ზეთი",
              ru: "Острая салями, моцарелла, острое масло",
              en: "Spicy salami, mozzarella, chili oil",
            },
          },
          {
            slug: "capricciosa",
            priceGel: 25,
            available: false,
            name: { ka: "კაპრიჩოზა", ru: "Капричоза", en: "Capricciosa" },
            description: {
              ka: "შუნკა, სოკო, არტიშოკი, ზეთისხილი",
              ru: "Ветчина, грибы, артишок, оливки",
              en: "Ham, mushrooms, artichoke, olives",
            },
          },
        ],
      },
    ],
  },

  "chicago-style": {
    slug: "chicago-style",
    brandColor: "#1f2937",
    name: {
      ka: "Chicago Style",
      ru: "Chicago Style",
      en: "Chicago Style",
    },
    address: {
      ka: "ბახტრიონის ქუჩა 11ბ, 0160, თბილისი",
      ru: "ул. Бахтриони 11б, 0160, Тбилиси",
      en: "Bakhtrionis St 11b, 0160, Tbilisi",
    },
    categories: [
      {
        slug: "crusty-tavern-36",
        name: {
          ka: "36 სმ ქრასთ ტავერნ პიცა",
          ru: "Пицца Crusty Tavern 36 см",
          en: "36cm Crusty Tavern Pizza",
        },
        items: [
          { slug: "ct-pepperoni", priceGel: 39, available: true,
            name: { ka: "ქრასთ ტავერნ პეპერონი", ru: "Crusty Tavern Пепперони", en: "Crusty Tavern Pepperoni" },
            description: { ka: "", ru: "", en: "" },
            photoUrl: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-i-m-a-g-e-v1/media__8/-t-e-x-t_-t-o_-i-m-a-g-e-7470ad4e-546d-4690-9dc6-cb05311f98a6.png?Expires=2103132917&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=tO2WsRtZEA9K4cKOvdfAM~asgmnoE3n9k4NriqbjtAq2eNrS6kUHixi9-8SFO9uRxjCB~X1iRtWtBbpmTXz5zCiJpcwvbmCzog9Hvelr40zNlsLOH3WbrpksggckeUsVW6Dw-69Wtz2JgR7jFYPGMb0XcLrReLACJ6sKsUpPw-HQ6Z0kjEGXgB5sDGhDHE1XTLd3-BGPJn700Cz-SCAS~NU80Ljiijq-PZME6E8f7w3eHg34zkTY2l46GjgR-UQL5tIRDnd6OtMseaD6sJgdPLRneasR0hG-7AgBulc4hX-BhsyRL~Sp5M-7M6VcMkyh5hAIQdTeLEaIew4fOEzX2w__" },
          { slug: "ct-4-cheese", priceGel: 39, available: true,
            name: { ka: "ქრასთ ტავერნ 4 ყველი", ru: "Crusty Tavern 4 сыра", en: "Crusty Tavern 4 Cheese" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ct-chicago", priceGel: 39, available: true,
            name: { ka: "ქრასთ ტავერნ ჩიკაგო", ru: "Crusty Tavern Чикаго", en: "Crusty Tavern Chicago" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ct-bacon", priceGel: 38, available: true,
            name: { ka: "ქრასთ ტავერნ ბეკონი", ru: "Crusty Tavern Бекон", en: "Crusty Tavern Bacon" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ct-margherita", priceGel: 36, available: true,
            name: { ka: "ქრასთ ტავერნ მარგერიტა", ru: "Crusty Tavern Маргерита", en: "Crusty Tavern Margherita" },
            description: { ka: "", ru: "", en: "" },
            photoUrl: "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-i-m-a-g-e-v1/media__8/-t-e-x-t_-t-o_-i-m-a-g-e-6c01fda9-e4f5-4e30-a4a7-217f05c54e98.png?Expires=2103132917&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=MBHbS4GCZgTrGUX8hqKtrjPQ-FvZr0VjQxpg-RYI-7dBvMdQjNKmOEyxNpM5B3ePNaTmLzOEJozUJCQbSpGaqp-~J3hwQ0jjUBiouf3yTTAInzw76qtL3M4gKO56vU4so77bcaPCDXJZ9GM5INObcVzupMZmqNFB5qkcvhFl7ixpRKOOBrJTCZN~3xbhTuID3lA5sZxUbW~0c5MNTJ7SE5A-ul3XCDgrDWkU6EXPgsyIU3IsT0HHzE336qnbaH9KmVsMnVsEaMMdHTUIjozJF8tYRdyF5Xr9d9v8bqyeuGUQF-u-d2E4wC~Rc4lM77dmh11j13PX8ZXTT0GshrL85w__" },
          { slug: "ct-sausage", priceGel: 39, available: true,
            name: { ka: "ქრასთ ტავერნ სოსისი", ru: "Crusty Tavern Сосиски", en: "Crusty Tavern Sausage" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ct-veggie", priceGel: 36, available: true,
            name: { ka: "ქრასთ ტავერნ ვეჯი", ru: "Crusty Tavern Веджи", en: "Crusty Tavern Veggie" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ct-pineapple", priceGel: 39, available: true,
            name: { ka: "ქრასთ ტავერნ ანანასი", ru: "Crusty Tavern Ананас", en: "Crusty Tavern Pineapple" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "american-pie-2p",
        name: {
          ka: "ამერიკული ფაი 2 პერსონაზე",
          ru: "Американский пирог на 2 персоны",
          en: "American Pie (2 persons)",
        },
        items: [
          { slug: "ap-pepperoni-s", priceGel: 32, available: true,
            name: { ka: "ამერიკული ფაი პეპერონი პატარა", ru: "Американский пирог Пепперони, маленький", en: "American Pie Pepperoni, Small" },
            description: { ka: "", ru: "", en: "" },
            photoUrl: "https://imageproxy.wolt.com/assets/67934a5269d4c47b6d16718f" },
          { slug: "ap-margherita-s", priceGel: 28, available: true,
            name: { ka: "ამერიკული ფაი მარგერიტა პატარა", ru: "Американский пирог Маргерита, маленький", en: "American Pie Margherita, Small" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-4cheese-s", priceGel: 32, available: true,
            name: { ka: "ამერიკული ფაი 4 ყველი პატარა", ru: "Американский пирог 4 сыра, маленький", en: "American Pie 4 Cheese, Small" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-bacon-s", priceGel: 32, available: true,
            name: { ka: "ამერიკული ფაი ბეკონით პატარა", ru: "Американский пирог с беконом, маленький", en: "American Pie with Bacon, Small" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-uncle-isaki-s", priceGel: 32, available: true,
            name: { ka: "ამერიკული ფაი ძია ისაკი", ru: "Американский пирог «Дядя Исаки»", en: "American Pie \"Uncle Isaki\"" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-jalapeno-s", priceGel: 32, available: true,
            name: { ka: "ამერიკული ფაი დონ ჰალაპენიო პატარა", ru: "Американский пирог Дон Халапеньо, маленький", en: "American Pie Don Jalapeño, Small" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "american-pie-3p",
        name: {
          ka: "ამერიკული ფაი 3 პერსონაზე",
          ru: "Американский пирог на 3 персоны",
          en: "American Pie (3 persons)",
        },
        items: [
          { slug: "ap-4cheese-l", priceGel: 49, available: true,
            name: { ka: "ამერიკული ფაი 4 ყველი დიდი", ru: "Американский пирог 4 сыра, большой", en: "American Pie 4 Cheese, Large" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-margherita-l", priceGel: 39, available: true,
            name: { ka: "ამერიკული ფაი მარგერიტა დიდი", ru: "Американский пирог Маргерита, большой", en: "American Pie Margherita, Large" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-pepperoni-l", priceGel: 49, available: true,
            name: { ka: "ამერიკული ფაი პეპერონი დიდი", ru: "Американский пирог Пепперони, большой", en: "American Pie Pepperoni, Large" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-jalapeno-l", priceGel: 49, available: true,
            name: { ka: "ამერიკული ფაი დონ ჰალაპენიო დიდი", ru: "Американский пирог Дон Халапеньо, большой", en: "American Pie Don Jalapeño, Large" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-bacon-l", priceGel: 75, available: true,
            name: { ka: "ამერიკული ფაი ბეკონით დიდი", ru: "Американский пирог с беконом, большой", en: "American Pie with Bacon, Large" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-uncle-isaki-l", priceGel: 49, available: true,
            name: { ka: "ამერიკული ფაი ძია ისაკი დიდი", ru: "Американский пирог «Дядя Исаки», большой", en: "American Pie \"Uncle Isaki\", Large" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "american-pie-4p",
        name: {
          ka: "ამერიკული ფაი 4 პერსონაზე",
          ru: "Американский пирог на 4 персоны",
          en: "American Pie (4 persons)",
        },
        items: [
          { slug: "ap-margherita-xl", priceGel: 65, available: true,
            name: { ka: "ექსტრა ამერიკული ფაი მარგერიტა", ru: "Экстра американский пирог Маргерита", en: "Extra American Pie Margherita" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-pepperoni-xl", priceGel: 75, available: true,
            name: { ka: "ექსტრა ამერიკული ფაი პეპერონი", ru: "Экстра американский пирог Пепперони", en: "Extra American Pie Pepperoni" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-4cheese-xl", priceGel: 75, available: true,
            name: { ka: "ექსტრა ამერიკული ფაი 4 ყველი", ru: "Экстра американский пирог 4 сыра", en: "Extra American Pie 4 Cheese" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-uncle-isaki-xl", priceGel: 75, available: true,
            name: { ka: "ამერიკული ფაი ძია ისაკი", ru: "Американский пирог «Дядя Исаки»", en: "American Pie \"Uncle Isaki\"" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-bacon-xl", priceGel: 75, available: true,
            name: { ka: "ექსტრა ამერიკული ფაი ბეკონით", ru: "Экстра американский пирог с беконом", en: "Extra American Pie with Bacon" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "ap-jalapeno-xl", priceGel: 75, available: true,
            name: { ka: "ექსტრა ამერიკული ფაი დონ ჰალაპენიო", ru: "Экстра американский пирог Дон Халапеньо", en: "Extra American Pie Don Jalapeño" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "crusty",
        name: { ka: "პიცა - Crusty", ru: "Пицца Crusty", en: "Crusty Pizza" },
        items: [
          { slug: "crusty-america", priceGel: 39, available: true,
            name: { ka: "Crusty ამერიკა", ru: "Crusty Америка", en: "Crusty America" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "crusty-margherita", priceGel: 34, available: true,
            name: { ka: "Crusty მარგერიტა", ru: "Crusty Маргерита", en: "Crusty Margherita" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "crusty-pepperoni", priceGel: 37, available: true,
            name: { ka: "Crusty პეპერონი", ru: "Crusty Пепперони", en: "Crusty Pepperoni" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "crusty-4cheese", priceGel: 37, available: true,
            name: { ka: "Crusty 4 ყველი", ru: "Crusty 4 сыра", en: "Crusty 4 Cheese" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "crusty-veggie-cheese", priceGel: 37, available: true,
            name: { ka: "Crusty ვეჯი ყველით", ru: "Crusty Веджи с сыром", en: "Crusty Veggie with Cheese" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "crusty-sausage-mix", priceGel: 39, available: true,
            name: { ka: "Crusty სოსიჯ მიქსი", ru: "Crusty Микс сосисок", en: "Crusty Sausage Mix" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "crusty-capricciosa", priceGel: 37, available: true,
            name: { ka: "Crusty კაპრიჩოზა", ru: "Crusty Капричоза", en: "Crusty Capricciosa" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "crusty-pineapple", priceGel: 37, available: true,
            name: { ka: "Crusty ანანასით", ru: "Crusty с ананасом", en: "Crusty with Pineapple" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "mac-cheese",
        name: { ka: "მაკ & ჩიზი", ru: "Мак энд чиз", en: "Mac & Cheese" },
        items: [
          { slug: "mc-chicken-wing", priceGel: 25, available: true,
            name: { ka: "მაკ & ჩიზი ქათმის ფრთით", ru: "Мак энд чиз с куриным крылышком", en: "Mac & Cheese with Chicken Wing" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "mc-4cheese", priceGel: 25, available: true,
            name: { ka: "მაკ & ჩიზი ოთხი ყველით", ru: "Мак энд чиз с четырьмя сырами", en: "Mac & Cheese with Four Cheeses" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "mc-pepperoni", priceGel: 25, available: true,
            name: { ka: "მაკ & ჩიზი პეპერონით", ru: "Мак энд чиз с пепперони", en: "Mac & Cheese with Pepperoni" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "mc-mushroom", priceGel: 25, available: true,
            name: { ka: "მაკ & ჩიზი სოკოთი", ru: "Мак энд чиз с грибами", en: "Mac & Cheese with Mushrooms" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "mc-bacon", priceGel: 25, available: true,
            name: { ka: "მაკ & ჩიზი ლორით", ru: "Мак энд чиз с беконом", en: "Mac & Cheese with Bacon" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "mc-sausage", priceGel: 25, available: true,
            name: { ka: "მაკ & ჩიზი სოსისით", ru: "Мак энд чиз с сосиской", en: "Mac & Cheese with Sausage" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "mc-chicken-fillet", priceGel: 25, available: true,
            name: { ka: "მაკ & ჩიზი ქათმის ფილეთი", ru: "Мак энд чиз с куриным филе", en: "Mac & Cheese with Chicken Fillet" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "mc-onion-rings", priceGel: 25, available: true,
            name: { ka: "მაკ & ჩიზი ხახვის რგოლებით", ru: "Мак энд чиз с луковыми кольцами", en: "Mac & Cheese with Onion Rings" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "wraps",
        name: { ka: "ვრეპი", ru: "Врап", en: "Wraps" },
        items: [
          { slug: "buffalo-chicken-wrap", priceGel: 14, available: true,
            name: { ka: "ბუფალო ქათმის ვრეპი", ru: "Врап с курицей буффало", en: "Buffalo Chicken Wrap" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "sides",
        name: { ka: "გარნირი", ru: "Гарнир", en: "Sides" },
        items: [
          { slug: "fries-xl", priceGel: 9, available: true,
            name: { ka: "ფრი XL", ru: "Картофель фри XL", en: "Fries XL" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "fries-m", priceGel: 5.5, available: true,
            name: { ka: "საშუალო ფრი", ru: "Картофель фри, средний", en: "Fries, Medium" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "sauces",
        name: { ka: "სოუსი", ru: "Соус", en: "Sauces" },
        items: [
          { slug: "ketchup", priceGel: 1.95, available: true,
            name: { ka: "კეტჩუპი", ru: "Кетчуп", en: "Ketchup" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "chicago-sauce", priceGel: 1.95, available: true,
            name: { ka: "სოუსი \"ჩიკაგო\" ტკბილცხარე", ru: "Соус «Чикаго», сладко-острый", en: "\"Chicago\" Sweet & Spicy Sauce" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "beverages",
        name: { ka: "გამაგრილებელი სასმელები", ru: "Прохладительные напитки", en: "Beverages" },
        items: [
          { slug: "coke-1-5l", priceGel: 7, available: true,
            name: { ka: "კოკა-კოლა 1.5ლიტრი", ru: "Кока-кола 1.5л", en: "Coca-Cola 1.5L" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "fanta", priceGel: 3.95, available: true,
            name: { ka: "ფანტა", ru: "Фанта", en: "Fanta" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "coke", priceGel: 3.95, available: true,
            name: { ka: "კოკა-კოლა", ru: "Кока-кола", en: "Coca-Cola" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "coke-zero", priceGel: 3.95, available: true,
            name: { ka: "კოკა კოლა - ზერო", ru: "Кока-кола Zero", en: "Coca-Cola Zero" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "water", priceGel: 3.5, available: true,
            name: { ka: "წყალი", ru: "Вода", en: "Water" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
      {
        slug: "wine",
        name: { ka: "ღვინო", ru: "Вино", en: "Wine" },
        items: [
          { slug: "beer", priceGel: 9, available: true,
            name: { ka: "ლუდი", ru: "Пиво", en: "Beer" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "wine-red-dzotsi", priceGel: 32, available: true,
            name: { ka: "წითელი ძოწი Georgian Sun (0.750 მლ)", ru: "Красное «Дзоци» Georgian Sun (0.75л)", en: "Red \"Dzotsi\" Georgian Sun (0.75L)" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "wine-daisi-tsiteli", priceGel: 32, available: true,
            name: { ka: "დაისის წითელი Georgian Sun", ru: "«Дайсис Цители» (красное) Georgian Sun", en: "\"Daisi Tsiteli\" Red, Georgian Sun" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "wine-gazapkhuli-mtsvane", priceGel: 32, available: true,
            name: { ka: "გაზაფხულის მწვანე Georgian Sun", ru: "«Газапхулис Мцване» (зелёное) Georgian Sun", en: "\"Gazapkhuli Mtsvane\", Georgian Sun" },
            description: { ka: "", ru: "", en: "" } },
          { slug: "wine-kindzmarauli", priceGel: 32, available: true,
            name: { ka: "ქინძმარაული Georgian Sun", ru: "Киндзмараули Georgian Sun", en: "Kindzmarauli, Georgian Sun" },
            description: { ka: "", ru: "", en: "" } },
        ],
      },
    ],
  },
};

export function getVenue(slug: string): Venue | undefined {
  return venues[slug];
}
