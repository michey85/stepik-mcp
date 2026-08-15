export interface StepikCourse {
  id: number;
  title: string;
}

export const COURSES_URI = 'stepik://courses';

export const COURSES: readonly StepikCourse[] = [
  { id: 113714, title: 'Redux для управления состоянием React-приложений' },
  { id: 120081, title: 'Компетенция Верстальщик — HTML, CSS, JavaScript' },
  { id: 114165, title: 'Фундаментальный JavaScript' },
  { id: 114174, title: 'Инструменты разработчика' },
  { id: 114197, title: 'React для современных веб-приложений' },
  {
    id: 233860,
    title: 'Node.js — бэкенд для фронтенда. От концепции до деплоя!',
  },
  { id: 200433, title: 'Тестирование JavaScript и React приложений' },
  { id: 121859, title: 'TypeScript для профессиональной разработки' },
] as const;
