// mockSource.js —— 内置示例数据源
// 模拟「从题库数据源拉取」的返回结构，与真实 HTTP 数据源格式一致。
// 接入真实数据源时，只需让接口返回相同结构（或题目数组），无需改动解析逻辑。
module.exports = {
  version: '1.0',
  source: 'mock',
  questions: [
    {
      id: 'mock-math-001',
      subject: '数学',
      knowledgePoint: '二次函数',
      difficulty: 1,
      type: 'single',
      stem: '抛物线 y = x² − 2x + 3 的顶点坐标是（　）',
      options: [
        { key: 'A', text: '(1, 2)' },
        { key: 'B', text: '(1, 4)' },
        { key: 'C', text: '(−1, 2)' },
        { key: 'D', text: '(−1, 4)' }
      ],
      answer: { keys: ['A'] },
      analysis: '将一般式转化为顶点式，或直接套用顶点坐标公式求解。',
      steps: [
        { order: 1, title: '审题：识别系数', content: '一般式 y = ax² + bx + c，本题 a = 1，b = −2，c = 3。' },
        { order: 2, title: '求顶点横坐标', content: '横坐标 x = −b / (2a) = −(−2) / (2×1) = 1。' },
        { order: 3, title: '代入求纵坐标', content: '把 x = 1 代入：y = 1² − 2×1 + 3 = 2。' },
        { order: 4, title: '写出结论', content: '顶点坐标为 (1, 2)，故选 A。' }
      ]
    },
    {
      id: 'mock-math-002',
      subject: '数学',
      knowledgePoint: '一元二次方程',
      difficulty: 2,
      type: 'multiple',
      stem: '方程 x² − 4x + 3 = 0 的解为（　）',
      options: [
        { key: 'A', text: 'x = 1' },
        { key: 'B', text: 'x = 2' },
        { key: 'C', text: 'x = 3' },
        { key: 'D', text: 'x = 4' }
      ],
      answer: { keys: ['A', 'C'] },
      analysis: '用十字相乘法因式分解，进而求出两根。',
      steps: [
        { order: 1, title: '尝试因式分解', content: '寻找两个数，使它们的和为 −4、积为 3，即 −1 和 −3。' },
        { order: 2, title: '写成乘积形式', content: 'x² − 4x + 3 = (x − 1)(x − 3) = 0。' },
        { order: 3, title: '分别令因式为零', content: 'x − 1 = 0 或 x − 3 = 0。' },
        { order: 4, title: '写出解', content: 'x = 1 或 x = 3，故选 A、C。' }
      ]
    },
    {
      id: 'mock-math-003',
      subject: '数学',
      knowledgePoint: '等差数列',
      difficulty: 1,
      type: 'fill',
      stem: '等差数列 2, 5, 8, … 的第 10 项为 ____。',
      options: [],
      answer: { blanks: [['29']] },
      analysis: '先确定首项与公差，再代入通项公式。',
      steps: [
        { order: 1, title: '确定首项与公差', content: '首项 a₁ = 2，公差 d = 5 − 2 = 3。' },
        { order: 2, title: '套用通项公式', content: 'aₙ = a₁ + (n − 1)d = 2 + (n − 1)×3。' },
        { order: 3, title: '代入 n = 10', content: 'a₁₀ = 2 + 9×3 = 2 + 27 = 29。' }
      ]
    },
    {
      id: 'mock-math-004',
      subject: '数学',
      knowledgePoint: '二次函数',
      difficulty: 3,
      type: 'solution',
      stem: '求二次函数 y = x² − 4x + 5 的最小值，并写出取得最小值时 x 的值。',
      options: [],
      answer: {
        reference: 'y = (x − 2)² + 1，当 x = 2 时，y 取得最小值 1。',
        keywords: ['配方', '(x−2)²', 'x = 2', '1']
      },
      analysis: '配方法：将一般式化为顶点式，顶点纵坐标即最值。',
      steps: [
        { order: 1, title: '配方', content: 'y = x² − 4x + 5 = (x² − 4x + 4) + 1 = (x − 2)² + 1。' },
        { order: 2, title: '判断最值', content: '平方项 (x − 2)² ≥ 0 恒成立，故 y ≥ 1。' },
        { order: 3, title: '确定取等条件', content: '当 (x − 2)² = 0，即 x = 2 时取等号。' },
        { order: 4, title: '得出结论', content: 'x = 2 时，y 的最小值为 1。' }
      ]
    },
    {
      id: 'mock-phy-001',
      subject: '物理',
      knowledgePoint: '牛顿运动定律',
      difficulty: 1,
      type: 'single',
      stem: '质量为 2 kg 的物体受到合外力作用，产生的加速度为 3 m/s²，则合外力大小为（　）',
      options: [
        { key: 'A', text: '3 N' },
        { key: 'B', text: '5 N' },
        { key: 'C', text: '6 N' },
        { key: 'D', text: '1.5 N' }
      ],
      answer: { keys: ['C'] },
      analysis: '直接套用牛顿第二定律 F = ma。',
      steps: [
        { order: 1, title: '列出公式', content: '牛顿第二定律：F = ma。' },
        { order: 2, title: '代入数据', content: 'F = 2 × 3 = 6 N。' },
        { order: 3, title: '得出结论', content: '合外力为 6 N，故选 C。' }
      ]
    },
    {
      id: 'mock-phy-002',
      subject: '物理',
      knowledgePoint: '匀变速直线运动',
      difficulty: 2,
      type: 'fill',
      stem: '物体由静止开始做匀加速直线运动，加速度 a = 2 m/s²，则 5 s 末的速度为 ____ m/s。',
      options: [],
      answer: { blanks: [['10']] },
      analysis: '初速度为零的匀加速直线运动，用 v = v₀ + at。',
      steps: [
        { order: 1, title: '列出速度公式', content: 'v = v₀ + at。' },
        { order: 2, title: '代入已知量', content: 'v₀ = 0，a = 2 m/s²，t = 5 s。' },
        { order: 3, title: '计算结果', content: 'v = 0 + 2×5 = 10 m/s。' }
      ]
    },
    {
      id: 'mock-phy-003',
      subject: '物理',
      knowledgePoint: '牛顿运动定律',
      difficulty: 3,
      type: 'solution',
      stem: '一个质量为 4 kg 的物体放在光滑水平面上，受到 20 N 的水平拉力，求物体的加速度大小。',
      options: [],
      answer: {
        reference: '由牛顿第二定律 a = F / m = 20 / 4 = 5 m/s²。',
        keywords: ['牛顿第二定律', 'F/m', '20/4', '5']
      },
      analysis: '光滑水平面说明无摩擦力，合力即拉力，直接应用牛顿第二定律。',
      steps: [
        { order: 1, title: '受力分析', content: '光滑水平面，无摩擦力，物体只受重力、支持力和 20 N 水平拉力，合力 F = 20 N。' },
        { order: 2, title: '应用牛顿第二定律', content: 'F = ma，则 a = F / m。' },
        { order: 3, title: '代入求解', content: 'a = 20 / 4 = 5 m/s²。' },
        { order: 4, title: '作答', content: '物体的加速度大小为 5 m/s²。' }
      ]
    }
  ]
};
