import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { storePhonesContactLine } from '@/lib/store-contacts'

const policyMeta = {
  effectiveDate: '06 мая 2026 г.',
  operatorName: '',
  operatorShortName: '«Теле-макс»',
  ogrnip: '323527500042923',
  inn: '525693244004',
  contactAddress: 'ул. Прасковьина, д. 21, офис 102',
  email: 'tele-makc@yandex.ru',
  phone: storePhonesContactLine(),
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-6xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl">Политика конфиденциальности</CardTitle>
            </CardHeader>
            <CardContent className="space-y-7 text-base md:text-[17px] leading-relaxed text-muted-foreground">
              <p>
                Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных
                данных пользователей сайта интернет-магазина TeleMakc (далее - Сайт).
              </p>
              <p>
                Оператор персональных данных: {policyMeta.operatorName} ({policyMeta.operatorShortName}),
                ОГРНИП {policyMeta.ogrnip}, ИНН {policyMeta.inn}, фактический адрес: {policyMeta.contactAddress},
                e-mail: {policyMeta.email}, телефон: {policyMeta.phone}.
              </p>
              <p>Дата вступления в силу: {policyMeta.effectiveDate}.</p>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">1. Общие положения</h2>
                <p>
                  1.1. Политика разработана в соответствии с Федеральным законом РФ N 152-ФЗ «О персональных данных»
                  и иными нормативными актами РФ.
                </p>
                <p>
                  1.2. Используя Сайт, пользователь подтверждает ознакомление с Политикой и согласие на обработку
                  персональных данных в указанном объеме.
                </p>
                <p>
                  1.3. Оператор вправе обновлять Политику. Новая редакция действует с момента публикации на данной
                  странице, если иное не указано в тексте новой редакции.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">2. Какие данные мы обрабатываем</h2>
                <p>
                  2.1. Данные, которые пользователь предоставляет самостоятельно: ФИО, телефон, e-mail,
                  адрес доставки, комментарий к заказу и иные сведения, переданные через формы Сайта.
                </p>
                <p>
                  2.2. Технические данные: IP-адрес, cookie, тип устройства, браузер, дата и время доступа,
                  адреса посещенных страниц и иная служебная информация.
                </p>
                <p>
                  2.3. Оператор не проверяет достоверность предоставленных данных, но исходит из того, что
                  пользователь указывает актуальные и достаточные сведения.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">3. Цели обработки персональных данных</h2>
                <p>3.1. Оформление, подтверждение и исполнение заказа.</p>
                <p>3.2. Доставка товаров, сервисное сопровождение, гарантийное и постгарантийное взаимодействие.</p>
                <p>3.3. Обратная связь с пользователем, информирование о статусе заказа.</p>
                <p>3.4. Улучшение работы Сайта, аналитика и обеспечение информационной безопасности.</p>
                <p>3.5. Исполнение требований законодательства РФ.</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">4. Правовые основания обработки</h2>
                <p>
                  4.1. Основаниями обработки являются: согласие пользователя, необходимость исполнения договора
                  купли-продажи и доставки, исполнение обязанностей, возложенных законодательством РФ, а также
                  законные интересы Оператора при условии соблюдения прав и свобод пользователя.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">5. Передача данных третьим лицам</h2>
                <p>
                  5.1. Оператор может передавать данные партнерам только в объеме, необходимом для выполнения
                  заказа и обеспечения работы Сайта (службы доставки, платежные сервисы, IT-подрядчики, сервисы рассылок).
                </p>
                <p>
                  5.2. Передача также допускается в случаях, прямо предусмотренных законодательством РФ.
                </p>
                <p>
                  5.3. Все лица, получающие доступ к данным по поручению Оператора, обязаны соблюдать
                  конфиденциальность и требования к защите персональных данных.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">6. Cookie и аналитика</h2>
                <p>
                  6.1. Сайт использует cookie-файлы для корректной работы функций, запоминания пользовательских
                  настроек и получения аналитики.
                </p>
                <p>
                  6.2. Пользователь может ограничить использование cookie в настройках браузера, однако это может
                  повлиять на работоспособность отдельных функций Сайта.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">7. Срок хранения данных</h2>
                <p>
                  7.1. Персональные данные хранятся не дольше, чем это необходимо для целей обработки,
                  либо в течение сроков, установленных законодательством РФ.
                </p>
                <p>
                  7.2. По достижении целей обработки или при наличии иных законных оснований данные подлежат
                  удалению или обезличиванию.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">8. Права пользователя</h2>
                <p>
                  8.1. Пользователь вправе получить информацию об обработке своих данных, требовать их уточнения,
                  блокирования или удаления, а также отозвать согласие на обработку в случаях, предусмотренных законом.
                </p>
                <p>
                  8.2. Для реализации прав пользователь направляет обращение на e-mail {policyMeta.email}
                  или по фактическому адресу Оператора.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">9. Защита персональных данных</h2>
                <p>
                  9.1. Оператор принимает необходимые организационные и технические меры для защиты персональных данных
                  от неправомерного доступа, уничтожения, изменения, блокирования, копирования и распространения.
                </p>
                <p>
                  9.2. Доступ к персональным данным предоставляется только уполномоченным лицам в пределах их полномочий.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">10. Контакты по вопросам персональных данных</h2>
                <p>10.1. E-mail для обращений: {policyMeta.email}.</p>
                <p>10.2. Телефон: {policyMeta.phone}.</p>
                <p>10.3. Фактический адрес: {policyMeta.contactAddress}.</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground">11. Заключительные положения</h2>
                <p>
                  11.1. К настоящей Политике и отношениям между пользователем и Оператором применяется
                  законодательство Российской Федерации.
                </p>
                <p>
                  11.2. Действующая редакция Политики всегда доступна на этой странице.
                </p>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}
