# Stepik MCP

MCP-сервер для работы с [Stepik API](https://stepik.org/api/docs/) прямо из Claude (или другого MCP-клиента). Позволяет получать данные по своим курсам на Stepik, отвечать на вопросы студентов, смотреть отзывы, доходы и управлять промокодами — без переключения в браузер.

Источник правды по эндпоинтам API — https://stepik.org/api/docs/, примеры запросов — https://github.com/StepicOrg/Stepik-API.

## Что умеет сервер

Сервер реализован на TypeScript поверх `@modelcontextprotocol/sdk` и авторизуется в Stepik по OAuth2 (`client_credentials`).

### Инструменты (tools)

| Инструмент | Описание |
|---|---|
| `getCourseList` | Список всех курсов автора (ID + название) |
| `getCourseBenefits` | Доход по курсам за период (по умолчанию — за последние 24 часа) |
| `getCorsesReviews` | Отзывы с 5 звёздами по всем курсам, постранично |
| `getReviewsByCourse` | Отзывы по конкретному курсу, постранично |
| `getUnansweredQuestionsFromBestInItCourse` | Неотвеченные вопросы в курсе «Best in IT» |
| `getCommentById` | Комментарий/вопрос по ID |
| `answerComment` | Ответить на комментарий/вопрос студента |
| `getNotifications` | Уведомления Stepik, постранично, с фильтром по прочитанности |
| `getLessonContent` | Содержимое урока по ID (опционально — конкретный шаг) |
| `getStepContent` | Содержимое одного шага по ID |
| `getActivePromoCodesByCourse` | Активные промокоды по курсу, постранично |
| `addPromoCode` | Создать промокод для курса |
| `addMultipleChoiceQuiz` | Добавить в урок шаг-квиз с вариантами ответа (одиночный или множественный выбор) |
| `addProgrammingTask` | Добавить в урок шаг с задачей по программированию (code challenge): условие, чекер, тест-кейсы, лимиты и шаблоны кода по языкам |
| `getCertificatePoints` | Текущие пороги баллов для сертификата (обычный/с отличием) и максимум баллов по курсу |
| `updateCertificatePoints` | Обновить пороги баллов для сертификата курса. По умолчанию считает от максимума баллов по курсу (с отличием = максимум − 3, обычный = максимум − 10); каждый порог можно задать явно |

## Установка

```bash
git clone <repo-url>
cd stepik-mcp
npm install
npm run build
```

Сборка попадёт в `build/index.js` (это же прописано как bin `stepik` в `package.json`).

## Учётные данные автора

Нужны OAuth-креды приложения Stepik (Client ID / Client Secret), которые выдаются на странице https://stepik.org/oauth2/applications/ при регистрации собственного приложения с grant type `client_credentials`.

Создайте файл `.env.local` в корне проекта (см. [.env.example](.env.example)):

```env
STEPIK_CLIENT_ID="..."
STEPIK_CLIENT_SECRET="..."
STEPIK_COURSES='[{"id":114197,"title":"React"},{"id":114165,"title":"Фундаментальный JavaScript"}]'
```

Путь к `.env.local` в [src/index.ts](src/index.ts) вычисляется относительно расположения проекта, так что файл достаточно положить в корень репозитория — переносить его при установке в другое место не нужно.

## Список курсов

Курсы, с которыми умеет работать сервер, задаются через переменную окружения `STEPIK_COURSES` — это JSON-массив объектов `{ "id": <ID курса на Stepik>, "title": "<название>", "isPackage": <опционально, true для пакета курсов> }`.

Если переменная не задана, сервер стартует с пустым списком курсов (инструмент `getCourseList` и подписи курсов в уведомлениях/доходах вернут пусто, остальной функционал не пострадает).

## Настройка в Claude Desktop

Откройте конфиг Claude Desktop:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Добавьте сервер в секцию `mcpServers`:

```json
{
  "mcpServers": {
    "stepik-mcp": {
      "command": "node",
      "args": ["/абсолютный/путь/до/stepik-mcp/build/index.js"]
    }
  }
}
```

Перезапустите Claude Desktop — сервер `stepik-mcp` должен появиться в списке доступных инструментов (значок 🔨/MCP в интерфейсе).

## Разработка

```bash
npm run build   # компиляция TypeScript в build/
```

Логи пишутся в `logs/app.log` (см. [src/logger.ts](src/logger.ts)).
