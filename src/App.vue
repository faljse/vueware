<script setup lang="ts">
import { KeyGenerator } from './KeyGen';
import { ref } from 'vue'

const productHash = ref("");
const serial = ref("");

const count = ref(0);
const version = ref(8);

function generate() {
  let keygen = new KeyGenerator(productHash.value);
  serial.value= keygen.GenerateSerial(count.value, version.value);
}

</script>

<template>
  <header>
  </header>
  <body>
    <input type="text" v-model="count" v-on:change="generate"/><p></p>
    <input type="text" v-model="version" v-on:change="generate"/><p></p>
    <input type="text" v-model="productHash" v-on:change="generate"/><p></p>
    <input type="text" v-model="serial"/><p></p>
  </body>
</template>

<style scoped>
</style>
