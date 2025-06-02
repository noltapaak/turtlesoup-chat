export interface Scenario {
  id: string;
  title: string;
  description: string;
  answer: string;
  explanation?: string;
}

export const scenarios: Scenario[] = [
  {
    id: '1',
    title: '바다거북 수프',
    description: '한 남자가 레스토랑에서 바다거북 수프를 먹고 집에 돌아가 자살했다. 무슨 일이 있었을까?',
    answer: '남자는 과거에 조난을 당해 바다거북 수프라고 들은 수프를 먹었으나, 실제로는 사람 고기였다. 진짜 바다거북 수프 맛을 확인하고 진실을 깨달아 자살했다.',
    explanation: '이 문제는 대표적인 바다거북 수프(추리 게임) 문제입니다.',
  },
  {
    id: '2',
    title: '붉은 옷의 여자',
    description: '한 남자가 붉은 옷을 입은 여자를 보고 도망쳤다. 왜?',
    answer: '남자는 색맹이었고, 붉은 옷을 입은 여자를 처음 보고 피에 대한 트라우마가 떠올라 도망쳤다.',
  },
  {
    id: '3',
    title: '정전',
    description: '정전이 된 후, 한 남자가 엘리베이터 안에서 죽었다. 무슨 일이 있었을까?',
    answer: '남자는 시각장애인으로, 엘리베이터 안내원이었다. 정전으로 인해 층수를 알 수 없어 내리지 못하고 갇혀 죽었다.',
  },
]; 