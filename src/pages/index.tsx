import { GetStaticProps } from 'next';
import Link from 'next/link';
import Prismic from '@prismicio/client';

import { getPrismicClient } from '../services/prismic';

import { FiCalendar, FiUser } from 'react-icons/fi';
import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Head from 'next/head';
import { useEffect } from 'react';
import { useState } from 'react';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextPage, setNextPage] = useState('');

  useEffect(() => {
    setPosts(postsPagination.results);
    setNextPage(postsPagination.next_page);
  }, [postsPagination.results, postsPagination.next_page]);

  async function handlePagination() {
    const response = await fetch(nextPage);
    const data = await response.json();

    const formattedPosts = data.results.map((post: Post) => {
      return {
        uid: post.uid,
        first_publication_date: post.first_publication_date,
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
      };
    });

    setPosts([...posts, ...formattedPosts]);
    setNextPage(data.next_page);
  }

  return (
    <>
      <Head>
        <title>Posts | spacetraveling</title>
      </Head>

      <main className={commonStyles.content}>
        <Header />
        <div className={styles.posts}>
          {posts.map((post) => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <div>
                  <span>
                    <FiCalendar />{' '}
                    {format(
                      new Date(post.first_publication_date),
                      'dd MMM yyyy',
                      {
                        locale: ptBR,
                      }
                    )}
                  </span>
                  <span>
                    <FiUser /> {post.data.author}
                  </span>
                </div>
              </a>
            </Link>
          ))}
        </div>
        {nextPage && (
          <button type="button" onClick={handlePagination}>
            Carregar mais posts
          </button>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['title', 'subtitle', 'author'],
      pageSize: 5,
    }
  );

  const posts: Post[] = postsResponse.results.map((post) => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: posts,
  };

  return {
    props: {
      postsPagination,
    },
    revalidate: 60 * 60, // 1h
  };
};
