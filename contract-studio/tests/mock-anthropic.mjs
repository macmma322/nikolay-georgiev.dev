// A local stand-in for POST /v1/messages that speaks real SSE, so tests exercise
// the actual Anthropic SDK streaming path. Replies depend on the last user message.
import { createServer } from 'node:http';

const usage = {
  input_tokens: 1000,
  output_tokens: 200,
  cache_read_input_tokens: 500,
  cache_creation_input_tokens: 100,
};

const send = (res, type, data) =>
  res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function reply(text) {
  if (/course platform/i.test(text)) {
    return {
      text: 'Записах какво знам. Кои са етапите на плащане и какъв е срокът за предаване?',
      tool: {
        name: 'propose_contract_changes',
        input: {
          summary: 'Course platform for EUR 2500 with separately priced additions',
          set_terms: {
            scope_summary: 'Разработка на платформа за курсове',
            deliverables: ['Платформа за онлайн курсове'],
            price_amount: 2500,
            currency: 'EUR',
          },
          missing_information: ['Payment milestones', 'Delivery date'],
          questions: ['What are the milestones?'],
        },
      },
    };
  }
  if (/milestones? (are|is)/i.test(text)) {
    return {
      text: 'Готово, предлагам структурирана чернова.',
      tool: {
        name: 'propose_contract_changes',
        input: {
          summary: 'Two milestones added',
          set_terms: {
            payment_schedule: [
              { label: 'Аванс', amount: 1000, due: 'при подписване' },
              { label: 'Финално плащане', amount: 1500, due: 'при приемане' },
            ],
            delivery_date: '2027-03-01',
          },
        },
      },
    };
  }
  if (/AI feature/i.test(text)) {
    return {
      text: 'Това не е в договорения обхват.',
      tool: {
        name: 'assess_scope_change',
        input: {
          title: 'Additional AI feature',
          request_summary: 'The client wants another AI feature',
          classification: 'excluded',
          reasoning: 'It is not among the agreed deliverables.',
          questions: ['Which model should it use?'],
          proposed_deliverables: ['AI асистент за курсовете'],
        },
      },
    };
  }
  if (/invented price/i.test(text)) {
    return {
      text: 'ok',
      tool: {
        name: 'propose_contract_changes',
        input: { summary: 'x', set_terms: { price_amount: 98765 } },
      },
    };
  }
  if (/change the parties/i.test(text)) {
    return {
      text: 'ok',
      tool: {
        name: 'propose_contract_changes',
        input: { summary: 'x', set_terms: {}, contractor: { name: 'Fake Ltd' } },
      },
    };
  }
  return { text: `Отговор на: ${text.slice(0, 40)}` };
}

export function startMock(port = 0) {
  const requests = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', async () => {
      const body = JSON.parse(raw);
      requests.push({ body, apiKey: req.headers['x-api-key'] });
      const last = body.messages.at(-1).content;
      const text = typeof last === 'string' ? last : '';
      if (/upstream rate limit/i.test(text)) {
        res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '0' });
        res.end(
          JSON.stringify({
            type: 'error',
            error: { type: 'rate_limit_error', message: 'secret-upstream-detail' },
          }),
        );
        return;
      }
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      send(res, 'message_start', {
        message: {
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          model: body.model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { ...usage, output_tokens: 1 },
        },
      });
      const answer = reply(text);
      send(res, 'content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
      const slow = /slow reply/i.test(text);
      const parts = slow
        ? Array.from({ length: 200 }, (_, i) => `дума${i} `)
        : answer.text.match(/.{1,12}/gsu);
      for (const part of parts) {
        if (res.destroyed) return;
        send(res, 'content_block_delta', { index: 0, delta: { type: 'text_delta', text: part } });
        await sleep(slow ? 40 : 2);
      }
      send(res, 'content_block_stop', { index: 0 });
      if (answer.tool) {
        send(res, 'content_block_start', {
          index: 1,
          content_block: { type: 'tool_use', id: 'toolu_1', name: answer.tool.name, input: {} },
        });
        send(res, 'content_block_delta', {
          index: 1,
          delta: { type: 'input_json_delta', partial_json: JSON.stringify(answer.tool.input) },
        });
        send(res, 'content_block_stop', { index: 1 });
      }
      send(res, 'message_delta', {
        delta: { stop_reason: answer.tool ? 'tool_use' : 'end_turn', stop_sequence: null },
        usage: { output_tokens: usage.output_tokens },
      });
      send(res, 'message_stop', {});
      res.end();
    });
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () =>
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        requests,
        stop: () =>
          new Promise((done) => {
            server.closeAllConnections();
            server.close(done);
          }),
      }),
    );
  });
}

if (process.argv[1]?.endsWith('mock-anthropic.mjs')) {
  const mock = await startMock(Number(process.argv[2] ?? 8799));
  console.log(`mock anthropic on ${mock.url}`);
}
