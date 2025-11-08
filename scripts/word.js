// Word component
export const Word = {
  props: ['word', 'isCompleted', 'isCurrent', 'isLast'],
  template: `
    <span 
      :class="{ 
        'word-completed': isCompleted,
        'word-current': isCurrent
      }"
      class="word"
    >
      {{ word }}<span v-if="!isLast">&nbsp;</span>
    </span>
  `
};

