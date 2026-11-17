import { context } from '@devvit/web/client';
import { useState } from 'react';
import { courseForPost, parsePostData } from '../shared/daily';
import { GameScreen } from './screens/GameScreen';

/** Which hole this post plays, from the post data the app set at creation. */
export const App = () => {
  const [post] = useState(() => parsePostData(context.postData));
  const [course] = useState(() => courseForPost(post));
  return <GameScreen course={course} post={post} />;
};
