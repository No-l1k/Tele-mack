'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ServiceTooltip } from '@/components/services/service-tooltip'
import {
  Monitor,
  Wrench,
  Eye,
  Shield,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

const TOOLTIP_BRACKET =
  'Кронштейн для телевизора — это специальное крепление, которое предназначено для установки и подвешивания телевизора на стену или потолок. С помощью такого крепления можно подвесить телевизор практически в любом месте комнаты, что позволяет добиться максимально функционального расположения и комфортного просмотра'

const TOOLTIP_PIXEL =
  'Наши специалисты производят проверку матрицы телевизора на наличие «битых» пикселей с помощью специальной программы. При заказе данной услуги мы гарантируем полное отсутствие «битых» пикселей в вашем телевизоре — это подтверждается сертификатом о проведённой проверке с печатью нашего магазина. Гарантия на отсутствие «битых» пикселей действует в течение двух недель.'

const TOOLTIP_SETUP =
  'Инженер подключит телевизор к сети и источнику сигнала, выполнит поиск и упорядочивание цифровых каналов, при необходимости настроит кабельное или спутниковое ТВ, поможет с базовой калибровкой изображения и звука, подключением к Wi‑Fi и первичной настройкой Smart TV (учётные записи, популярные приложения). Перечень работ согласуется при оформлении заказа в зависимости от модели и ваших пожеланий.'

const TOOLTIP_WARRANTY =
  'Все заботы по ремонту мы возьмём на себя в течение срока действия услуги (2–3 года). Вам не придётся самостоятельно обращаться в сервисный центр. Если товар не подлежит ремонту, мы обменяем его на новый той же модели. Если модели нет в наличии — подберём аналог по функциональности. Срок услуги считается с момента покупки. Гарантия не действует, если поломка произошла по вине покупателя (оценка — по результатам экспертизы сервисного центра).'

type ServiceItem = {
  icon: LucideIcon
  title: string
  description: string
  price: string
  features: string[]
  tooltip: string
}

const services: ServiceItem[] = [
  {
    icon: Wrench,
    title: 'Установка телевизора',
    description: 'Профессиональный монтаж телевизора на стену с использованием качественных кронштейнов',
    price: 'от 3 000',
    features: [
      'Монтаж кронштейна на стену',
      'Подвес телевизора',
      'Скрытие проводов (по возможности)',
      'Первичная настройка',
    ],
    tooltip: TOOLTIP_BRACKET,
  },
  {
    icon: Eye,
    title: 'Проверка на битые пиксели',
    description: 'Тщательная проверка экрана телевизора на наличие дефектных пикселей перед доставкой',
    price: 'от 1 500',
    features: [
      'Проверка на все типы дефектов',
      'Тестирование на разных цветах',
      'Акт проверки',
      'Гарантия отсутствия битых пикселей',
    ],
    tooltip: TOOLTIP_PIXEL,
  },
  {
    icon: Monitor,
    title: 'Настройка телевизора',
    description: 'Полная настройка телевизора: каналы, интернет, приложения, калибровка изображения',
    price: 'от 2 000',
    features: [
      'Настройка цифровых каналов',
      'Подключение к Wi-Fi',
      'Установка приложений',
      'Калибровка изображения',
    ],
    tooltip: TOOLTIP_SETUP,
  },
  {
    icon: Shield,
    title: 'Расширенная гарантия',
    description: 'Дополнительная гарантия на технику сверх гарантии производителя',
    price: 'от 2 000',
    features: [
      'Продление гарантии до 3 лет',
      'Быстрое обслуживание',
      'Бесплатная диагностика',
      'Замена или ремонт',
    ],
    tooltip: TOOLTIP_WARRANTY,
  },
]

export function ServicesCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {services.map((service) => (
        <Card key={service.title} className="flex flex-col">
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <service.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex items-start gap-2">
              <CardTitle className="flex-1">{service.title}</CardTitle>
              <ServiceTooltip text={service.tooltip} />
            </div>
            <CardDescription>{service.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ul className="space-y-2 flex-1">
              {service.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t flex items-center justify-between gap-3">
              <div>
                <span className="text-sm text-muted-foreground">Стоимость</span>
                <p className="text-xl font-bold text-primary">{service.price} руб</p>
              </div>
              <Link href="/contacts">
                <Button>Заказать</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
