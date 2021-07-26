import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Header from '../../components/Header';
import Prismic from '@prismicio/client';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Post {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  function calculateEstimatedReadingTime(post: Post): number {
    const wordsPerMinute = 200;
    const wordsCount =
      RichText.asText(
        post.data.content.reduce((acc, data) => [...acc, ...data.body], [])
      ).split(' ').length +
      RichText.asText(
        post.data.content.reduce((acc, data) => {
          if (data.heading) {
            return [...acc, ...data.heading.split(' ')];
          }
          return [...acc];
        }, [])
      ).split(' ').length;

    const readingEstimatedTime = Math.ceil(wordsCount / wordsPerMinute);
    return readingEstimatedTime;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>
      <Header />

      {post.data.banner.url && (
        <section className={styles.banner}>
          <img src={post.data.banner.url} alt="Banner" />
        </section>
      )}

      <main className={commonStyles.content}>
        <article className={styles.post}>
          <h1 className={styles.title}>{post.data.title}</h1>
          <div className={styles.postInfo}>
            <span>
              <FiCalendar />{' '}
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </span>
            <span>
              <FiUser /> {post.data.author}
            </span>
            <span>
              <FiClock /> {calculateEstimatedReadingTime(post)} min
            </span>
          </div>
          <div className={styles.postContent}>
            {post.data.content.map(({ heading, body }) => (
              <div key={heading}>
                {heading && <h2>{heading}</h2>}

                <div
                  className={styles.postSection}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: RichText.asHtml(body) }}
                />
              </div>
            ))}
          </div>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'post')],
    { pageSize: 5 }
  );

  const paths = posts.results.map((result) => {
    return {
      params: {
        slug: result.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PostProps> = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  const post: Post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 30, // 30min
  };
};
