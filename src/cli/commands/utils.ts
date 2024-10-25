import readline from 'readline';

export function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, (answer: string) => {
    rl.close();
    resolve(answer);
  }));
}
