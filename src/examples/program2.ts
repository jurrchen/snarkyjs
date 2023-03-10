import {
  SelfProof,
  Field,
  Proof,
  Experimental,
  verify,
  isReady,
  provablePure,
} from 'snarkyjs';

await isReady;

type CompositeInput = {
  a: Field,
  b: Field,
}

const CompositeInput = provablePure(
  { a: Field, b: Field },
  { customObjectKeys: ['a', 'b'] }
);

let Program1 = Experimental.ZkProgram({
  publicInput: CompositeInput,

  methods: {
    baseCase: {
      privateInputs: [],

      method(publicInput: CompositeInput) {
        publicInput.a.assertEquals(Field(0))
        publicInput.b.assertEquals(Field(0))
      },
    },
  },
});


const Program1Proof = Experimental.ZkProgram.Proof(Program1);

let Program2 = Experimental.ZkProgram({
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      method(publicInput: Field) {
        publicInput.assertEquals(Field(1))
      },
    },

    inductiveCase: {
      privateInputs: [Program1Proof],

      // and can we add a self proof???
      method(publicInput: Field, anotherProof: Proof<CompositeInput>) {
        anotherProof.verify();
        anotherProof.publicInput.a.add(1).assertEquals(publicInput);
        anotherProof.publicInput.b.add(1).assertEquals(publicInput);
      },
    },
  },
});

console.time('compiling MyProgram...');
await Program1.compile();
console.timeEnd('compiling MyProgram...');


console.time('compiling Jank...');
const { verificationKey } = await Program2.compile();
console.timeEnd('compiling Jank...');
console.log('verification key', verificationKey.slice(0, 10) + '..');

console.log('proving base case...');
const proof = await Program1.baseCase({
  a: Field(0),
  b: Field(0)
});

console.time('proving step 1...');
const proof2 = await Program2.inductiveCase(Field(1), proof);
console.timeEnd('proving step 1...');

console.log('verify...');
const ok = await verify(proof2, verificationKey);
console.log('ok?', ok);
