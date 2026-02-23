import mongoose from 'mongoose';
import { config } from '../config/env';
import { Topic } from '../models/Topic';
import { Thread } from '../models/Thread';
import { Reply } from '../models/Reply';
import { logger } from '../utils/logger';

const predefinedTopics = [
  {
    name: 'Movies',
    slug: 'movies',
    description: 'Discuss your favorite films, share recommendations, and debate the classics',
    gradient: 'from-blue-600/20 to-purple-600/20',
    icon: 'film',
  },
  {
    name: 'Trending',
    slug: 'trending',
    description: 'What\'s hot right now in cinema? Discuss the latest releases and trends',
    gradient: 'from-red-600/20 to-orange-600/20',
    icon: 'trending',
  },
  {
    name: 'Upcoming',
    slug: 'upcoming',
    description: 'Get hyped for upcoming releases and share your most anticipated films',
    gradient: 'from-green-600/20 to-teal-600/20',
    icon: 'calendar',
  },
  {
    name: 'Reviews',
    slug: 'reviews',
    description: 'In-depth reviews and critical discussions about movies old and new',
    gradient: 'from-yellow-600/20 to-amber-600/20',
    icon: 'star',
  },
];

const mockUsers = [
  { user_id: 'user_1', username: 'CinemaFan92', avatar_url: null },
  { user_id: 'user_2', username: 'MovieBuff', avatar_url: null },
  { user_id: 'user_3', username: 'FilmCritic', avatar_url: null },
  { user_id: 'user_4', username: 'PopcornLover', avatar_url: null },
  { user_id: 'user_5', username: 'DirectorDreams', avatar_url: null },
];

const mockThreads = [
  {
    topic_slug: 'movies',
    title: 'What makes a perfect sci-fi movie?',
    content: 'I\'ve been thinking about what elements make a sci-fi film truly great. For me, it\'s the balance between realistic science and compelling storytelling. What do you all think?',
    tags: ['sci-fi', 'discussion', 'recommendations'],
  },
  {
    topic_slug: 'movies',
    title: 'Underrated horror films you need to watch',
    content: 'Let\'s share some hidden gems in the horror genre. I\'ll start: The Wailing (2016) - a Korean psychological horror that will leave you questioning everything.',
    tags: ['horror', 'recommendations', 'hidden-gems'],
  },
  {
    topic_slug: 'trending',
    title: 'Dune Part Two - Discussion Thread',
    content: 'Just watched Dune Part Two and I\'m blown away! The visuals, the performances, everything was perfect. Let\'s discuss (spoilers welcome).',
    tags: ['dune', 'spoilers', 'discussion'],
  },
  {
    topic_slug: 'trending',
    title: 'The rise of A24 films',
    content: 'A24 has been consistently putting out amazing indie films. What\'s your favorite A24 movie and why?',
    tags: ['a24', 'indie', 'discussion'],
  },
  {
    topic_slug: 'upcoming',
    title: 'Most anticipated films of 2026',
    content: 'What movies are you most excited for this year? I can\'t wait for the new Christopher Nolan film!',
    tags: ['2026', 'anticipation', 'discussion'],
  },
  {
    topic_slug: 'upcoming',
    title: 'Marvel Phase 6 predictions',
    content: 'With Phase 6 on the horizon, what are your predictions for the MCU? Secret Wars is going to be insane!',
    tags: ['marvel', 'mcu', 'predictions'],
  },
  {
    topic_slug: 'reviews',
    title: 'Oppenheimer (2023) - A Masterpiece',
    content: 'Just watched Oppenheimer for the third time. Nolan\'s best work yet. The technical brilliance combined with Murphy\'s performance creates something truly special. 10/10',
    tags: ['oppenheimer', 'nolan', '5-stars'],
  },
  {
    topic_slug: 'reviews',
    title: 'Poor Things - Weird but Wonderful',
    content: 'Yorgos Lanthimos strikes again with Poor Things. Emma Stone gives a career-defining performance. It\'s bizarre, beautiful, and thought-provoking. 9/10',
    tags: ['poor-things', 'emma-stone', '4-stars'],
  },
];

const mockReplies = [
  {
    content: 'Totally agree! Blade Runner 2049 is the perfect example of this balance.',
    threadIndex: 0,
  },
  {
    content: 'Don\'t forget about the world-building aspect. That\'s crucial for sci-fi!',
    threadIndex: 0,
  },
  {
    content: 'The Wailing is incredible! Also check out The Witch if you haven\'t.',
    threadIndex: 1,
  },
  {
    content: 'The cinematography was absolutely stunning. Every frame could be a painting.',
    threadIndex: 2,
  },
  {
    content: 'The sandworm riding scene was worth the ticket price alone!',
    threadIndex: 2,
  },
  {
    content: 'Everything Everywhere All at Once is their best work IMO',
    threadIndex: 3,
  },
  {
    content: 'Hereditary and Midsommar are both A24 masterpieces',
    threadIndex: 3,
  },
  {
    content: 'The new Avatar sequel is at the top of my list!',
    threadIndex: 4,
  },
  {
    content: 'I think they\'ll finally introduce the X-Men properly',
    threadIndex: 5,
  },
  {
    content: 'Cillian Murphy deserved that Oscar. What a performance!',
    threadIndex: 6,
  },
];

// Helper function to generate slug from title
function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${suffix}`;
}

async function seedDatabase() {
  try {
    // Connect to database
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');

    // Clear existing data
    await Topic.deleteMany({});
    await Thread.deleteMany({});
    await Reply.deleteMany({});
    logger.info('Cleared existing data');

    // Create topics
    const createdTopics = await Topic.insertMany(predefinedTopics);
    logger.info(`Created ${createdTopics.length} topics`);

    // Create threads with slugs
    const threadsToCreate = mockThreads.map((thread, index) => ({
      ...thread,
      slug: generateSlug(thread.title),
      created_by: mockUsers[index % mockUsers.length],
      stats: {
        reply_count: 0,
        upvotes: Math.floor(Math.random() * 50),
        views: Math.floor(Math.random() * 500),
      },
      last_activity_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    }));

    const createdThreads = await Thread.insertMany(threadsToCreate);
    logger.info(`Created ${createdThreads.length} threads`);

    // Create replies with BOTH thread_id and thread_slug
    const repliesToCreate = mockReplies.map((reply, index) => ({
      thread_id: createdThreads[reply.threadIndex]._id.toString(), // ✅ Add thread_id
      thread_slug: createdThreads[reply.threadIndex].slug, // ✅ Add thread_slug
      content: reply.content,
      created_by: mockUsers[(index + 2) % mockUsers.length],
      stats: {
        upvotes: Math.floor(Math.random() * 20),
      },
      created_at: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
    }));

    const createdReplies = await Reply.insertMany(repliesToCreate);
    logger.info(`Created ${createdReplies.length} replies`);

    // Update thread reply counts
    for (const thread of createdThreads) {
      const replyCount = await Reply.countDocuments({ thread_id: thread._id.toString() });
      await Thread.updateOne(
        { _id: thread._id },
        { 'stats.reply_count': replyCount }
      );
    }

    // Update topic thread counts
    for (const topic of createdTopics) {
      const threadCount = await Thread.countDocuments({ topic_slug: topic.slug });
      await Topic.updateOne(
        { _id: topic._id },
        { thread_count: threadCount }
      );
    }

    logger.info('✅ Database seeded successfully!');
    logger.info(`
Summary:
- ${createdTopics.length} topics
- ${createdThreads.length} threads
- ${createdReplies.length} replies
    `);

  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });