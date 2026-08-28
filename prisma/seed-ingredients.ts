import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Список ингредиентов и цен для точки "Chicago Style".
// Единица измерения по умолчанию — "кг", поменяй у нужных позиций
// прямо в админке (граммы/мл/литры/штуки) после загрузки.
const VENUE_SLUG = "chicago-style";
const DEFAULT_UNIT = "кг";

const INGREDIENTS: { name: string; price: number }[] = [
  { name: "BBQ", price: 25.0 },
  { name: "BBQ სოუსი", price: 20.36 },
  { name: "ავოკადო", price: 35.0 },
  { name: "ავოკადოს კრემი", price: 40.0 },
  { name: "აისბერგი", price: 3.0 },
  { name: "ბატატი", price: 6.0 },
  { name: "ბაჰარი", price: 6.0 },
  { name: "ბეკონი", price: 15.0 },
  { name: "ბრინჯი ბასმათი", price: 20.0 },
  { name: "ბრინჯის ნუდლსი", price: 15.0 },
  { name: "ბროკოლი", price: 4.0 },
  { name: "ბროწეული", price: 1.0 },
  { name: "ბულგარული", price: 6.0 },
  { name: "ბურგერის ფუნთუშა", price: 0.6 },
  { name: "გაუდა", price: 28.0 },
  { name: "გოგრა", price: 2.6 },
  { name: "გორგონძოლა", price: 40.0 },
  { name: "დარიჩინი", price: 30.0 },
  { name: "დაფნა", price: 8.0 },
  { name: "ედამერი", price: 28.0 },
  { name: "ზეთის ხილი", price: 3.4 },
  { name: "ზეითუნის ზეთი", price: 18.0 },
  { name: "ზუთხი", price: 35.0 },
  { name: "ზუთხი (ნარჩენი)", price: 35.0 },
  { name: "ზუთხი დაჭრილი", price: 45.0 },
  { name: "ზუთხის ბულიონი ნ/ფ", price: 12.13 },
  { name: "ზუთხის ფილე", price: 60.0 },
  { name: "თეთრი ღვინო", price: 12.0 },
  { name: "თეთრი ხახვი", price: 3.0 },
  { name: "კამა", price: 18.0 },
  { name: "კანგაცლილი ტომატი(1 ლიტ)", price: 16.0 },
  { name: "კარამელიზირებული ხახვი", price: 12.13 },
  { name: "კარაქი", price: 60.0 },
  { name: "კარტოფილი", price: 1.6 },
  { name: "კეჩუპი", price: 15.0 },
  { name: "კვერცხი", price: 0.45 },
  { name: "კიტრი", price: 2.3 },
  { name: "კონტეინერი პატარა სოუსისთვის", price: 0.05 },
  { name: "კოქტეილ სოუსი", price: 12.21 },
  { name: "ლიმონი", price: 7.0 },
  { name: "ლორი", price: 16.0 },
  { name: "ლურჯი ყველი", price: 35.0 },
  { name: "ლურჯი ყველის სოუსი", price: 23.22 },
  { name: "მაიონეზი", price: 6.0 },
  { name: "მაიონეზი 2", price: 3.2 },
  { name: "მარილი", price: 1.1 },
  { name: "მარცვლოვანი მდოგვი", price: 0.4 },
  { name: "მზესუმზირის ზეთი", price: 4.4 },
  { name: "მიკრომწვანილი", price: 25.0 },
  { name: "მოცარელა", price: 18.0 },
  { name: "მოცარელა ბელგიური", price: 23.0 },
  { name: "მოცარელა პანირებული", price: 3.62 },
  { name: "მოცარელა პოლონური", price: 16.5 },
  { name: "მჟავე კიტრი", price: 0 },
  { name: "მშრალი აჯიკა", price: 7.0 },
  { name: "მწვანე ბარდა", price: 16.0 },
  { name: "მწვანე ბულგარული", price: 7.0 },
  { name: "მწვანე ლობიო", price: 25.0 },
  { name: "მწვანე ხახვი", price: 16.0 },
  { name: "მწყერი", price: 1.0 },
  { name: "ნაღები 35%", price: 16.0 },
  { name: "ნებისმიერი სოუსი", price: 0.5 },
  { name: "ნივრის სოუსი რანჩი", price: 1.0 },
  { name: "ნიორი", price: 6.0 },
  { name: "ოთხი ყველის სოუსი", price: 32.6 },
  { name: "ოისტერი", price: 15.0 },
  { name: "ოხრახუში", price: 1.2 },
  { name: "პანირებული მოცარელა", price: 3.62 },
  { name: "პანკო", price: 12.0 },
  { name: "პაპრიკა", price: 1.0 },
  { name: "პარმეზანი", price: 95.0 },
  { name: "პარმეზანის სოუსი", price: 30.94 },
  { name: "პეპერონი", price: 38.0 },
  { name: "პესტოს სოუსი", price: 1.0 },
  { name: "პილპილი შავი", price: 30.0 },
  { name: "პომიდორი", price: 6.0 },
  { name: "პომიდორის სალსა", price: 8.22 },
  { name: "რუკოლა მწვანე", price: 40.0 },
  { name: "საფუარი სველი", price: 1.5 },
  { name: "საქონლის ფარში", price: 17.31 },
  { name: "საქონლის ხორცი", price: 16.0 },
  { name: "სეზამი", price: 35.0 },
  { name: "სეზამის ზეთი", price: 45.0 },
  { name: "სვანური მარილი", price: 8.0 },
  { name: "სიმინდი", price: 3.25 },
  { name: "სოიოს სოუსი", price: 25.0 },
  { name: "სოკო", price: 10.0 },
  { name: "სომხური ლავაში", price: 1.0 },
  { name: "სოუსი", price: 50.3 },
  { name: "სტაფილო", price: 1.0 },
  { name: "სულგუნი", price: 19.0 },
  { name: "სუმახი", price: 1.0 },
  { name: "ტერიაკის სოუსი", price: 26.0 },
  { name: "ტკბილმჟავე სოუსი", price: 12.0 },
  { name: "ტკბილცხარე სოუსი", price: 12.0 },
  { name: "ტრიუფელის სოუსი", price: 11.34 },
  { name: "ტყემალი", price: 25.0 },
  { name: "უნაგის სოუსი", price: 32.0 },
  { name: "ფიშონ მარინადი ნ/ფ(201)", price: 18.75 },
  { name: "ფიშონ სოუსი, ნ/ფ", price: 15.53 },
  { name: "ფორთოხალი", price: 0.6 },
  { name: "ფორთოხლის სოუსი ნ/ფ", price: 3.82 },
  { name: "ფრი", price: 5.5 },
  { name: "ფქვილი", price: 3.2 },
  { name: "ფქვილი კაპუტო", price: 6.3 },
  { name: "ფქვილი ლა ფამილია", price: 3.0 },
  { name: "ქათმის ნაგეტსი", price: 20.0 },
  { name: "ქათმის ფილე", price: 16.0 },
  { name: "ქათმის ფრთები", price: 6.0 },
  { name: "ქათმის შნიცელი", price: 15.0 },
  { name: "ქამა სოკო", price: 12.0 },
  { name: "ქინძი", price: 6.0 },
  { name: "ღორის კისერი", price: 12.0 },
  { name: "ღორის ნეკნი", price: 15.0 },
  { name: "ღორის რბილი", price: 12.0 },
  { name: "ღორის სალა", price: 8.0 },
  { name: "ყაბაყი", price: 1.0 },
  { name: "ყავისფერი შაქარი", price: 4.0 },
  { name: "ყვავილოვანი კომბოსტო", price: 4.0 },
  { name: "ყვითელი ბულგარული", price: 6.0 },
  { name: "ყუთი 25", price: 0.4 },
  { name: "ყუთი 33", price: 0.45 },
  { name: "ყუთი 41", price: 0.65 },
  { name: "შავი პილპილი", price: 30.0 },
  { name: "შავი პილპილის მარცვალი", price: 10.0 },
  { name: "შაქარი", price: 2.05 },
  { name: "ჩედარი", price: 35.0 },
  { name: "ჩედარის სოუსი", price: 28.06 },
  { name: "ჩერი", price: 6.0 },
  { name: "ცომი", price: 29.78 },
  { name: "ცხარე სოუსი", price: 1.0 },
  { name: "წითელი ბულგარული", price: 6.0 },
  { name: "წითელი კომბოსტო", price: 2.0 },
  { name: "წითელი ღვინო", price: 5.0 },
  { name: "წითელი ხახვი", price: 3.0 },
  { name: "წიწილა", price: 15.0 },
  { name: "წყალი", price: 0.01 },
  { name: "ხახვი", price: 1.0 },
  { name: "ხახვის ჩიფსი ნ/ფ", price: 25.0 },
  { name: "ხბოს ნეკნი", price: 18.0 },
  { name: "ხბოს რბილი", price: 20.0 },
  { name: "ხის სოკო", price: 16.0 },
  { name: "ჰალაპენიო", price: 18.0 },
  { name: "ჰოუმეიდ მაიო", price: 15.17 },
];

async function main() {
  const venue = await prisma.venue.findUnique({ where: { slug: VENUE_SLUG } });
  if (!venue) {
    throw new Error(`Точка со slug "${VENUE_SLUG}" не найдена`);
  }

  const existing = await prisma.ingredient.findMany({ where: { venueId: venue.id } });
  const existingByName = new Map(existing.map((i) => [i.name.trim(), i]));

  let created = 0;
  let updated = 0;

  for (const item of INGREDIENTS) {
    const found = existingByName.get(item.name.trim());
    if (found) {
      await prisma.ingredient.update({
        where: { id: found.id },
        data: { pricePerUnit: item.price },
      });
      updated++;
    } else {
      await prisma.ingredient.create({
        data: {
          venueId: venue.id,
          name: item.name,
          unit: DEFAULT_UNIT,
          pricePerUnit: item.price,
          available: true,
        },
      });
      created++;
    }
  }

  console.log(`Готово. Создано новых: ${created}, обновлена цена у существующих: ${updated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
