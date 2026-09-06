export const en = {
  onboarding: {
    intro: {
      title: 'rabbit hole',
      body: 'Curiosity, one card at a time — swipe through Wikipedia, and it learns what you love.',
      cta: 'Get started',
      attribution: 'via Wikipedia · content credited & linked on every card',
    },
    interests: {
      title: 'What are you curious about?',
      body: 'Pick at least {{min}} to shape your feed. You can change these anytime.',
      cta: 'Continue',
      selectedCount: '{{count}} selected',
      needMore: ' · need {{count}} more',
    },
    auth: {
      title: 'Save your picks',
      body: 'Create an account so your interests and progress stick around.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      sendCodeCta: 'Send code',
      codeLabel: 'Enter the 6-digit code',
      codePlaceholder: '123456',
      verifyCta: 'Verify',
      resendCta: 'Use a different email',
      guestDivider: 'or',
      guestCta: 'Continue as guest',
      guestDisclaimer: 'Your picks stay on this device until you add an email later.',
    },
  },
  tabs: {
    feed: 'Feed',
    quiz: 'Quiz',
    profile: 'Profile',
  },
  feed: {
    loading: 'Finding your first cards…',
    loadError: 'Couldn\'t load your feed.',
    retryCta: 'Try again',
    refilling: 'Bringing more your way…',
    caughtUp: 'You\'re all caught up for now.',
    checkAgainCta: 'Check again',
    controls: {
      skipLabel: 'Skip this article',
      likeLabel: 'Like this article',
    },
    card: {
      attributionCta: 'via Wikipedia',
    },
    stamps: {
      like: 'LIKED',
      skip: 'PASS',
    },
    hint: {
      body: 'Swipe left to pass, right if you like it — it shapes your feed',
    },
  },
  reader: {
    readOnWikipediaCta: 'Read on Wikipedia',
    loading: 'Loading article…',
    loadError: 'Couldn\'t load this article.',
  },
  quiz: {
    placeholderTitle: 'Quiz',
  },
  profile: {
    levelLabel: 'Level {{level}}',
    stats: {
      streak: 'day streak',
      xp: 'discovery XP',
      liked: 'liked',
    },
    badgesTitle: 'Badges',
    badges: {
      firstLike: 'First Like',
      explorer: 'Category Explorer',
      curator: 'Curator',
    },
    weightsTitle: 'Interest weights — why you see what you see',
    savedTitle: 'Liked articles',
    seeAllCta: 'See all {{count}} liked articles',
    noSaved: "Nothing liked yet — swipe right on a card you're into.",
    editInterestsCta: 'Edit interests',
    privacyCta: 'Privacy & consent',
    avatar: {
      title: 'Profile photo',
      takePhoto: 'Take photo',
      chooseFromLibrary: 'Choose from library',
      cancel: 'Cancel',
      permissionDenied: 'Camera/library permission was denied.',
    },
  },
  editInterests: {
    title: 'Edit interests',
    saveCta: 'Save',
  },
  likedArticles: {
    title: 'Liked articles',
  },
  privacy: {
    title: 'Privacy & consent',
    analyticsLabel: 'Product analytics',
    analyticsBody: 'Beyond basic crash reporting. EU-hosted.',
    leaderboardLabel: 'Public leaderboard',
    leaderboardBody: 'Off by default — opt in to compare discovery scores.',
    doneCta: 'Done',
  },
} as const;
